import type { VercelRequest, VercelResponse } from '@vercel/node';
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
  const identity = await requireRole(req, res, sql, ['admin']);
  if (!identity) return;

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT p.id, p.user_id, p.display_name, p.registration_type,
               p.registration_number, p.registration_region, p.bio, p.status,
               p.created_at, u.name, u.email
        FROM professional_profiles p
        JOIN users u ON u.id = p.user_id
        WHERE p.status = 'pending'
        ORDER BY p.created_at ASC
      `;
      return res.status(200).json(rows);
    }

    const parsed = professionalProfileDecisionSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.issues);
    const profiles = await sql`
      SELECT id, user_id FROM professional_profiles WHERE id = ${parsed.data.profileId}
    `;
    if (profiles.length === 0) return res.status(404).json({ error: 'Professional profile not found' });
    const profile = profiles[0];
    const status = parsed.data.decision === 'approve' ? 'approved' : 'rejected';
    const role = parsed.data.decision === 'approve' ? 'professional' : 'student';
    await sql`UPDATE professional_profiles SET status = ${status}, updated_at = NOW() WHERE id = ${profile.id}`;
    await sql`UPDATE users SET role = ${role}, updated_at = NOW() WHERE id = ${profile.user_id}`;
    await writeAuditLog(sql, {
      actorUserId: identity.userId,
      subjectUserId: profile.user_id,
      action: `professional_profile.${parsed.data.decision}d`,
      entityType: 'professional_profile',
      entityId: profile.id,
      metadata: { status, role },
    });
    return res.status(200).json({ id: profile.id, status, role });
  } catch (error) {
    console.error('Professional review error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
