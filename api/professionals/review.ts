import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { requireRole } from '../middleware/auth';
import { professionalProfileDecisionSchema, validationError } from '../middleware/validation';
import { writeAuditLog } from '../services/audit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'PUT'])) return;
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });
  const identity = await requireRole(req, res, sql, ['admin_verifier']);
  if (!identity) return;

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT c.id AS credential_id, p.id AS profile_id, c.user_id, p.display_name,
               c.professional_role, c.registration_type, c.registration_number,
               c.registration_region, c.status, c.created_at, u.name, u.email
        FROM professional_credentials c
        JOIN professional_profiles p ON p.user_id = c.user_id
        JOIN users u ON u.id = c.user_id
        WHERE c.status = 'pending'
        ORDER BY c.created_at ASC
      `;
      return res.status(200).json(rows);
    }

    const parsed = professionalProfileDecisionSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.issues);
    const credentials = await sql`
      SELECT c.id, c.user_id, c.professional_role
      FROM professional_credentials c
      JOIN professional_profiles p ON p.user_id = c.user_id
      WHERE c.id = ${parsed.data.credentialId ?? ''}
         OR p.id = ${parsed.data.profileId ?? ''}
      ORDER BY c.created_at
      LIMIT 1
    `;
    if (credentials.length === 0) return res.status(404).json({ error: 'Professional credential not found' });
    const credential = credentials[0];
    const status = parsed.data.decision === 'approve'
      ? 'verified'
      : parsed.data.decision === 'suspend'
        ? 'suspended'
        : 'rejected';
    const roleStatus = status === 'verified' ? 'active' : status;
    const auditAction = status === 'verified' ? 'approved' : status;
    await sql.transaction((txn: any) => [
      txn`
        UPDATE professional_credentials SET status = ${status},
          verified_at = ${status === 'verified' ? new Date().toISOString() : null},
          verified_by = ${status === 'verified' ? identity.userId : null}, updated_at = NOW()
        WHERE id = ${credential.id}
      `,
      txn`
        INSERT INTO user_roles (id, user_id, role, status, granted_by, updated_at)
        VALUES (
          ${randomUUID()}, ${credential.user_id}, ${credential.professional_role},
          ${roleStatus}, ${identity.userId}, NOW()
        )
        ON CONFLICT (user_id, role) DO UPDATE SET
          status = EXCLUDED.status, granted_by = EXCLUDED.granted_by, updated_at = NOW()
      `,
      txn`
        UPDATE professional_profiles SET status = CASE
          WHEN EXISTS (
            SELECT 1 FROM professional_credentials
            WHERE user_id = ${credential.user_id} AND status = 'verified' AND id <> ${credential.id}
          ) OR ${status} = 'verified' THEN 'approved'
          WHEN EXISTS (
            SELECT 1 FROM professional_credentials
            WHERE user_id = ${credential.user_id} AND status = 'pending' AND id <> ${credential.id}
          ) THEN 'pending'
          ELSE 'rejected'
        END, updated_at = NOW()
        WHERE user_id = ${credential.user_id}
      `,
      txn`
        UPDATE users SET role = CASE
          WHEN EXISTS (
            SELECT 1 FROM professional_credentials
            WHERE user_id = ${credential.user_id} AND status = 'verified' AND id <> ${credential.id}
          ) OR ${status} = 'verified' THEN 'professional'
          ELSE 'student'
        END, updated_at = NOW()
        WHERE id = ${credential.user_id} AND role <> 'admin'
      `,
    ]);
    await writeAuditLog(sql, {
      actorUserId: identity.userId,
      subjectUserId: credential.user_id,
      action: `professional_credential.${auditAction}`,
      entityType: 'professional_credential',
      entityId: credential.id,
      metadata: { status, role: credential.professional_role },
    });
    return res.status(200).json({ id: credential.id, status, role: credential.professional_role });
  } catch (error) {
    console.error('Professional review error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
