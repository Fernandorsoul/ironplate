import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { requireAuth } from '../middleware/auth';
import {
  professionalLinkDecisionSchema,
  professionalLinkPostSchema,
  validationError,
} from '../middleware/validation';
import { writeAuditLog } from '../services/audit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'POST', 'PUT'])) return;
  if (!['GET', 'POST', 'PUT'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT l.id, l.professional_id, l.student_id, l.status, l.purpose,
               l.consent_version, l.created_at, l.updated_at,
               c.status AS consent_status, c.scopes_json, c.granted_at, c.revoked_at,
               u.name AS professional_name
        FROM professional_student_links l
        JOIN users u ON u.id = l.professional_id
        LEFT JOIN consent_records c ON c.link_id = l.id
        WHERE l.professional_id = ${identity.userId} OR l.student_id = ${identity.userId}
        ORDER BY l.created_at DESC
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const parsed = professionalLinkPostSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error.issues);
      if (parsed.data.studentId === identity.userId) {
        return res.status(400).json({ error: 'A user cannot link to itself' });
      }

      const professional = await sql`
        SELECT p.id FROM professional_profiles p
        JOIN users u ON u.id = p.user_id
        WHERE p.user_id = ${identity.userId} AND u.role = 'professional' AND p.status = 'approved'
      `;
      if (professional.length === 0) {
        return res.status(403).json({ error: 'Approved professional profile required' });
      }
      const student = await sql`SELECT id FROM users WHERE id = ${parsed.data.studentId}`;
      if (student.length === 0) return res.status(404).json({ error: 'Student not found' });
      const duplicate = await sql`
        SELECT id, status FROM professional_student_links
        WHERE professional_id = ${identity.userId} AND student_id = ${parsed.data.studentId}
      `;
      if (duplicate.length > 0) {
        const existingLinkId = duplicate[0].id;
        await sql`
          UPDATE professional_student_links
          SET status = 'pending', purpose = ${parsed.data.purpose},
              consent_version = ${parsed.data.consentVersion}, requested_by = ${identity.userId},
              updated_at = NOW()
          WHERE id = ${existingLinkId} AND professional_id = ${identity.userId}
        `;
        await sql`
          UPDATE consent_records
          SET purpose = ${parsed.data.purpose}, scopes_json = ${JSON.stringify(parsed.data.scopes)},
              version = ${parsed.data.consentVersion}, status = 'requested',
              granted_at = NULL, revoked_at = NULL
          WHERE link_id = ${existingLinkId} AND subject_user_id = ${parsed.data.studentId}
        `;
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          subjectUserId: parsed.data.studentId,
          action: 'professional_student_link.scope_change_requested',
          entityType: 'professional_student_link',
          entityId: existingLinkId,
          metadata: { scopes: parsed.data.scopes, consentVersion: parsed.data.consentVersion },
        });
        return res.status(200).json({ id: existingLinkId, status: 'pending' });
      }

      const linkId = randomUUID();
      await sql`
        INSERT INTO professional_student_links (
          id, professional_id, student_id, requested_by, status, purpose, consent_version
        ) VALUES (
          ${linkId}, ${identity.userId}, ${parsed.data.studentId}, ${identity.userId},
          'pending', ${parsed.data.purpose}, ${parsed.data.consentVersion}
        )
      `;
      await sql`
        INSERT INTO consent_records (id, link_id, subject_user_id, purpose, scopes_json, version, status)
        VALUES (
          ${randomUUID()}, ${linkId}, ${parsed.data.studentId}, ${parsed.data.purpose},
          ${JSON.stringify(parsed.data.scopes)}, ${parsed.data.consentVersion}, 'requested'
        )
      `;
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        subjectUserId: parsed.data.studentId,
        action: 'professional_student_link.requested',
        entityType: 'professional_student_link',
        entityId: linkId,
        metadata: {
          purpose: parsed.data.purpose,
          scopes: parsed.data.scopes,
          consentVersion: parsed.data.consentVersion,
        },
      });
      return res.status(201).json({ id: linkId, status: 'pending' });
    }

    const parsed = professionalLinkDecisionSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.issues);
    const links = await sql`
      SELECT id, professional_id, student_id FROM professional_student_links WHERE id = ${parsed.data.linkId}
    `;
    if (links.length === 0) return res.status(404).json({ error: 'Link not found' });
    const link = links[0];
    if (link.student_id !== identity.userId) return res.status(403).json({ error: 'Only the student can decide consent' });

    const status = parsed.data.decision === 'approve' ? 'active' : 'revoked';
    await sql`
      UPDATE professional_student_links SET status = ${status}, updated_at = NOW() WHERE id = ${link.id}
    `;
    await sql`
      UPDATE consent_records
      SET status = ${parsed.data.decision === 'approve' ? 'granted' : 'revoked'},
          granted_at = ${parsed.data.decision === 'approve' ? new Date() : null},
          revoked_at = ${parsed.data.decision === 'revoke' ? new Date() : null}
      WHERE link_id = ${link.id}
    `;
    await writeAuditLog(sql, {
      actorUserId: identity.userId,
      subjectUserId: identity.userId,
      action: `professional_student_link.${parsed.data.decision}d`,
      entityType: 'professional_student_link',
      entityId: link.id,
    });
    return res.status(200).json({ id: link.id, status });
  } catch (error) {
    console.error('Professional links error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
