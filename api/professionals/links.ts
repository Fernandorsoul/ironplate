import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { generalRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import {
  professionalLinkDecisionSchema,
  professionalLinkPostSchema,
  validationError,
} from '../middleware/validation';
import { createLinkInvitationToken, hashLinkInvitationToken } from '../security/linkInvitation';
import { writeAuditLog } from '../services/audit';
import type { DataScope } from '../services/authorization';

const ROLE_SCOPES: Record<'nutritionist' | 'fitness_professional', Set<DataScope>> = {
  nutritionist: new Set([
    'basic_profile', 'nutrition_data', 'meals_adherence', 'meal_plans', 'weight',
    'body_measurements', 'scheduling',
  ]),
  fitness_professional: new Set([
    'basic_profile', 'weight', 'body_measurements', 'prescribed_training',
    'training_execution', 'scheduling',
  ]),
};

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function scopesMatchRoles(scopes: readonly DataScope[], roles: Array<'nutritionist' | 'fitness_professional'>): boolean {
  return scopes.every(scope => roles.some(role => ROLE_SCOPES[role].has(scope)));
}

function mapLink(row: Record<string, any>, viewerId: string) {
  const expired = row.status === 'active'
    && row.expires_at
    && new Date(row.expires_at).getTime() <= Date.now();
  return {
    id: row.id,
    professionalId: row.professional_id,
    studentId: row.student_id,
    viewerRole: row.student_id === viewerId ? 'student' : 'professional',
    professionalName: row.professional_name,
    professionalRoles: parseStringArray(row.professional_roles_json),
    registrations: parseStringArray(row.registrations_json),
    status: expired ? 'expired' : row.status,
    purpose: row.purpose,
    requestedScopes: parseStringArray(row.requested_scopes_json),
    grantedScopes: parseStringArray(row.scopes_json),
    consentStatus: row.consent_status,
    consentVersion: row.consent_version,
    activatedAt: row.activated_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined,
    lastChangedAt: row.consent_changed_at ?? row.updated_at,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'POST', 'PUT'])) return;
  if (!['GET', 'POST', 'PUT'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  await generalRateLimit(req, res, async () => {
  try {
    const previewToken = req.method === 'POST'
      ? (typeof req.body?.token === 'string' ? req.body.token : null)
      : (typeof req.query.token === 'string' ? req.query.token : null);
    const isPreview = req.method === 'GET' || (req.method === 'POST' && previewToken);
    if (isPreview && previewToken) {
      const token = previewToken.trim();
      if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(404).json({ error: 'Invitation unavailable' });
      const rows = await sql`
        SELECT i.id, i.professional_id, i.professional_roles_json, i.purpose, i.scopes_json,
               i.consent_version, i.duration_days, i.expires_at, p.display_name,
               COALESCE(json_agg(json_build_object(
                 'role', c.professional_role, 'type', c.registration_type,
                 'number', c.registration_number, 'region', c.registration_region
               )) FILTER (WHERE c.id IS NOT NULL), '[]') AS registrations
        FROM professional_link_invitations i
        JOIN professional_profiles p ON p.user_id = i.professional_id
        LEFT JOIN professional_credentials c ON c.user_id = i.professional_id
          AND c.status = 'verified'
          AND i.professional_roles_json::jsonb ? c.professional_role
        WHERE i.token_hash = ${hashLinkInvitationToken(token)}
          AND i.status = 'issued' AND i.expires_at > NOW()
        GROUP BY i.id, p.display_name
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Invitation unavailable' });
      const invitation = rows[0] as Record<string, any>;
      return res.status(200).json({
        professionalId: invitation.professional_id,
        professionalName: invitation.display_name,
        professionalRoles: parseStringArray(invitation.professional_roles_json),
        registrations: typeof invitation.registrations === 'string'
          ? JSON.parse(invitation.registrations)
          : invitation.registrations,
        purpose: invitation.purpose,
        scopes: parseStringArray(invitation.scopes_json),
        consentVersion: invitation.consent_version,
        durationDays: invitation.duration_days,
        expiresAt: invitation.expires_at,
        revocationNotice: 'Voce pode limitar ou revogar este acesso imediatamente nas configuracoes de privacidade.',
      });
    }

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT l.*, u.name AS professional_name,
               latest.status AS consent_status, latest.scopes_json,
               latest.created_at AS consent_changed_at,
               COALESCE((
                 SELECT json_agg(c.registration_type || ' ' || c.registration_number || '/' || c.registration_region)
                 FROM professional_credentials c
                 WHERE c.user_id = l.professional_id AND c.status = 'verified'
               ), '[]') AS registrations_json
        FROM professional_student_links l
        JOIN users u ON u.id = l.professional_id
        LEFT JOIN LATERAL (
          SELECT status, scopes_json, created_at
          FROM consent_records
          WHERE link_id = l.id
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ) latest ON TRUE
        WHERE l.professional_id = ${identity.userId} OR l.student_id = ${identity.userId}
        ORDER BY l.updated_at DESC
      `;
      return res.status(200).json((rows as Record<string, any>[]).map(row => mapLink(row, identity.userId)));
    }

    if (req.method === 'POST') {
      const parsed = professionalLinkPostSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error.issues);
      const input = parsed.data;
      const verifiedRows = await sql`
        SELECT c.professional_role
        FROM professional_credentials c
        JOIN user_roles r ON r.user_id = c.user_id AND r.role = c.professional_role
        WHERE c.user_id = ${identity.userId} AND c.status = 'verified' AND r.status = 'active'
          AND c.professional_role = ANY(${input.professionalRoles})
      `;
      const verifiedRoles = new Set((verifiedRows as Array<{ professional_role: string }>).map(row => row.professional_role));
      if (input.professionalRoles.some(role => !verifiedRoles.has(role))) {
        return res.status(403).json({ error: 'Verified professional roles required' });
      }
      if (!scopesMatchRoles(input.scopes, input.professionalRoles)) {
        return res.status(400).json({ error: 'Requested scope is incompatible with professional roles' });
      }

      const token = createLinkInvitationToken();
      const id = randomUUID();
      const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
      await sql`
        INSERT INTO professional_link_invitations (
          id, professional_id, token_hash, professional_roles_json, purpose, scopes_json,
          consent_version, duration_days, expires_at
        ) VALUES (
          ${id}, ${identity.userId}, ${hashLinkInvitationToken(token)},
          ${JSON.stringify(input.professionalRoles)}, ${input.purpose}, ${JSON.stringify(input.scopes)},
          ${input.consentVersion}, ${input.durationDays}, ${expiresAt.toISOString()}
        )
      `;
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        action: 'professional_link_invitation.issued',
        entityType: 'professional_link_invitation',
        entityId: id,
        metadata: { roles: input.professionalRoles, scopes: input.scopes, expiresAt: expiresAt.toISOString() },
      });
      const appUrl = (process.env.EXPO_PUBLIC_APP_URL || 'https://ironplate-phi.vercel.app').replace(/\/$/, '');
      return res.status(201).json({
        id,
        token,
        invitationUrl: `${appUrl}/professional-invite/${token}`,
        qrPayload: `${appUrl}/professional-invite/${token}`,
        expiresAt: expiresAt.toISOString(),
      });
    }

    const parsed = professionalLinkDecisionSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.issues);
    const decision = parsed.data;

    if (decision.decision === 'accept' || decision.decision === 'decline') {
      const tokenHash = hashLinkInvitationToken(decision.token);
      const invitations = await sql`
        SELECT id, professional_id, professional_roles_json, purpose, scopes_json,
               consent_version, duration_days
        FROM professional_link_invitations
        WHERE token_hash = ${tokenHash} AND status = 'issued' AND expires_at > NOW()
      `;
      if (invitations.length === 0) return res.status(404).json({ error: 'Invitation unavailable' });
      const invitation = invitations[0] as Record<string, any>;
      if (invitation.professional_id === identity.userId) {
        return res.status(400).json({ error: 'A professional cannot accept their own invitation' });
      }

      if (decision.decision === 'decline') {
        const declined = await sql`
          UPDATE professional_link_invitations
          SET status = 'declined', accepted_by = ${identity.userId}, used_at = NOW()
          WHERE id = ${invitation.id} AND status = 'issued' AND expires_at > NOW()
          RETURNING id
        `;
        if (declined.length === 0) return res.status(404).json({ error: 'Invitation unavailable' });
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          subjectUserId: identity.userId,
          action: 'professional_link_invitation.declined',
          entityType: 'professional_link_invitation',
          entityId: invitation.id,
        });
        return res.status(200).json({ status: 'declined' });
      }

      const requestedScopes = parseStringArray(invitation.scopes_json) as DataScope[];
      const grantedScopes = (decision.scopes ?? requestedScopes) as DataScope[];
      if (grantedScopes.some(scope => !requestedScopes.includes(scope))) {
        return res.status(400).json({ error: 'Granted scopes must be a subset of requested scopes' });
      }
      const linkId = randomUUID();
      const consentId = randomUUID();
      const linkExpiresAt = new Date(Date.now() + Number(invitation.duration_days) * 24 * 60 * 60 * 1000);
      const accepted = await sql`
        WITH claimed AS (
          UPDATE professional_link_invitations
          SET status = 'accepted', accepted_by = ${identity.userId}, used_at = NOW()
          WHERE id = ${invitation.id} AND status = 'issued' AND expires_at > NOW()
          RETURNING *
        ), linked AS (
          INSERT INTO professional_student_links (
            id, professional_id, student_id, requested_by, status, purpose, consent_version,
            requested_scopes_json, professional_roles_json, origin, activated_at, expires_at,
            revoked_at, last_action_by, updated_at
          )
          SELECT ${linkId}, professional_id, ${identity.userId}, professional_id, 'active', purpose,
                 consent_version, scopes_json, professional_roles_json, 'invite_link', NOW(),
                 ${linkExpiresAt.toISOString()}, NULL, ${identity.userId}, NOW()
          FROM claimed
          ON CONFLICT (professional_id, student_id) DO UPDATE SET
            status = 'active', purpose = EXCLUDED.purpose,
            consent_version = EXCLUDED.consent_version,
            requested_scopes_json = EXCLUDED.requested_scopes_json,
            professional_roles_json = EXCLUDED.professional_roles_json,
            origin = EXCLUDED.origin, activated_at = NOW(), expires_at = EXCLUDED.expires_at,
            revoked_at = NULL, last_action_by = EXCLUDED.last_action_by, updated_at = NOW()
          RETURNING id
        ), consented AS (
          INSERT INTO consent_records (
            id, link_id, subject_user_id, purpose, scopes_json, version, status,
            granted_at, expires_at, changed_by
          )
          SELECT ${consentId}, id, ${identity.userId}, ${invitation.purpose},
                 ${JSON.stringify(grantedScopes)}, ${invitation.consent_version}, 'granted',
                 NOW(), ${linkExpiresAt.toISOString()}, ${identity.userId}
          FROM linked
          RETURNING link_id
        ) SELECT link_id AS id FROM consented
      `;
      if (accepted.length === 0) return res.status(404).json({ error: 'Invitation unavailable' });
      const activeLinkId = accepted[0].id as string;
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        subjectUserId: identity.userId,
        action: 'professional_student_link.accepted',
        entityType: 'professional_student_link',
        entityId: activeLinkId,
        metadata: { scopes: grantedScopes, expiresAt: linkExpiresAt.toISOString() },
      });
      return res.status(200).json({ id: activeLinkId, status: 'active', grantedScopes });
    }

    if (!('linkId' in decision)) return res.status(400).json({ error: 'Invalid link decision' });
    const links = await sql`
      SELECT id, professional_id, student_id, status, purpose, consent_version, requested_scopes_json,
             expires_at
      FROM professional_student_links WHERE id = ${decision.linkId}
    `;
    if (links.length === 0) return res.status(404).json({ error: 'Link not found' });
    const link = links[0] as Record<string, any>;
    if (link.student_id !== identity.userId) {
      return res.status(403).json({ error: 'Only the student can change consent' });
    }

    if (decision.decision === 'limit') {
      if (link.status !== 'active' || (link.expires_at && new Date(link.expires_at).getTime() <= Date.now())) {
        return res.status(409).json({ error: 'Only an active link can be limited' });
      }
      const requestedScopes = parseStringArray(link.requested_scopes_json);
      if (decision.scopes.some(scope => !requestedScopes.includes(scope))) {
        return res.status(400).json({ error: 'Granted scopes must be a subset of requested scopes' });
      }
      const limited = await sql`
        WITH active_link AS (
          UPDATE professional_student_links
          SET last_action_by = ${identity.userId}, updated_at = NOW()
          WHERE id = ${link.id} AND student_id = ${identity.userId} AND status = 'active'
            AND (expires_at IS NULL OR expires_at > NOW())
          RETURNING id
        )
        INSERT INTO consent_records (
          id, link_id, subject_user_id, purpose, scopes_json, version, status,
          granted_at, expires_at, changed_by
        )
        SELECT ${randomUUID()}, id, ${identity.userId}, ${link.purpose},
               ${JSON.stringify(decision.scopes)}, ${link.consent_version}, 'granted', NOW(),
               ${link.expires_at}, ${identity.userId}
        FROM active_link
        RETURNING link_id
      `;
      if (limited.length === 0) return res.status(409).json({ error: 'Only an active link can be limited' });
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        subjectUserId: identity.userId,
        action: 'professional_student_link.scopes_limited',
        entityType: 'professional_student_link',
        entityId: link.id,
        metadata: { scopes: decision.scopes },
      });
      return res.status(200).json({ id: link.id, status: 'active', grantedScopes: decision.scopes });
    }

    const revoked = await sql`
      WITH active_link AS (
        UPDATE professional_student_links
        SET status = 'revoked', revoked_at = NOW(), last_action_by = ${identity.userId}, updated_at = NOW()
        WHERE id = ${link.id} AND student_id = ${identity.userId} AND status = 'active'
        RETURNING id
      )
        INSERT INTO consent_records (
          id, link_id, subject_user_id, purpose, scopes_json, version, status, revoked_at, changed_by
        )
        SELECT ${randomUUID()}, id, ${identity.userId}, ${link.purpose}, '[]',
          ${link.consent_version}, 'revoked', NOW(), ${identity.userId}
        FROM active_link
        RETURNING link_id
    `;
    if (revoked.length === 0) return res.status(409).json({ error: 'Only an active link can be revoked' });
    await writeAuditLog(sql, {
      actorUserId: identity.userId,
      subjectUserId: identity.userId,
      action: 'professional_student_link.revoked',
      entityType: 'professional_student_link',
      entityId: link.id,
    });
    return res.status(200).json({ id: link.id, status: 'revoked' });
  } catch (error) {
    console.error('Professional links error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
  });
}
