import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { requireAuth } from '../middleware/auth';
import { professionalProfilePostSchema, validationError } from '../middleware/validation';
import { writeAuditLog } from '../services/audit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'POST'])) return;
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, display_name, registration_type, registration_number,
               registration_region, bio, status, created_at, updated_at
        FROM professional_profiles WHERE user_id = ${identity.userId}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Professional profile not found' });
      return res.status(200).json(rows[0]);
    }

    const parsed = professionalProfilePostSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.issues);
    const profile = parsed.data;
    const existing = await sql`SELECT id FROM professional_profiles WHERE user_id = ${identity.userId}`;
    const profileId = existing[0]?.id || randomUUID();

    await sql`
      INSERT INTO professional_profiles (
        id, user_id, display_name, registration_type, registration_number,
        registration_region, bio, status, updated_at
      ) VALUES (
        ${profileId}, ${identity.userId}, ${profile.displayName}, ${profile.registrationType},
        ${profile.registrationNumber}, ${profile.registrationRegion}, ${profile.bio ?? null},
        'pending', NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        registration_type = EXCLUDED.registration_type,
        registration_number = EXCLUDED.registration_number,
        registration_region = EXCLUDED.registration_region,
        bio = EXCLUDED.bio,
        status = 'pending',
        updated_at = NOW()
    `;
    await writeAuditLog(sql, {
      actorUserId: identity.userId,
      subjectUserId: identity.userId,
      action: 'professional_profile.submitted',
      entityType: 'professional_profile',
      entityId: profileId,
      metadata: { status: 'pending' },
    });
    return res.status(201).json({ id: profileId, status: 'pending' });
  } catch (error) {
    console.error('Professional profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
