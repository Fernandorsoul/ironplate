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
      const [credentials, roles] = await Promise.all([
        sql`
          SELECT id, professional_role, registration_type, registration_number,
                 registration_region, status, verified_at, created_at, updated_at
          FROM professional_credentials WHERE user_id = ${identity.userId}
          ORDER BY professional_role
        `,
        sql`SELECT role, status FROM user_roles WHERE user_id = ${identity.userId} ORDER BY role`,
      ]);
      const profile = rows[0] as Record<string, any>;
      return res.status(200).json({
        id: profile.id,
        displayName: profile.display_name,
        bio: profile.bio ?? undefined,
        status: profile.status,
        credentials: (credentials as Record<string, any>[]).map((credential) => ({
          id: credential.id,
          professionalRole: credential.professional_role,
          registrationType: credential.registration_type,
          registrationNumber: credential.registration_number,
          registrationRegion: credential.registration_region,
          status: credential.status,
          verifiedAt: credential.verified_at ?? undefined,
          createdAt: credential.created_at,
          updatedAt: credential.updated_at,
        })),
        roles: (roles as Record<string, any>[]).map((role) => ({ role: role.role, status: role.status })),
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      });
    }

    const parsed = professionalProfilePostSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.issues);
    const profile = parsed.data;
    const existing = await sql`SELECT id FROM professional_profiles WHERE user_id = ${identity.userId}`;
    const profileId = existing[0]?.id || randomUUID();
    const credentials = profile.credentials ?? [{
      professionalRole: profile.registrationType === 'CRN' ? 'nutritionist' as const : 'fitness_professional' as const,
      registrationType: profile.registrationType!,
      registrationNumber: profile.registrationNumber!,
      registrationRegion: profile.registrationRegion!,
    }];
    const primary = credentials[0];
    await sql.transaction((txn: any) => [
      txn`
        INSERT INTO professional_profiles (
          id, user_id, display_name, registration_type, registration_number,
          registration_region, bio, status, updated_at
        ) VALUES (
          ${profileId}, ${identity.userId}, ${profile.displayName}, ${primary.registrationType},
          ${primary.registrationNumber}, ${primary.registrationRegion}, ${profile.bio ?? null},
          'pending', NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          registration_type = EXCLUDED.registration_type,
          registration_number = EXCLUDED.registration_number,
          registration_region = EXCLUDED.registration_region,
          bio = EXCLUDED.bio,
          updated_at = NOW()
      `,
      ...credentials.flatMap((credential) => [
        txn`
          INSERT INTO professional_credentials (
            id, user_id, professional_role, registration_type, registration_number,
            registration_region, status, verified_at, verified_by, updated_at
          ) VALUES (
            ${randomUUID()}, ${identity.userId}, ${credential.professionalRole},
            ${credential.registrationType}, ${credential.registrationNumber},
            ${credential.registrationRegion}, 'pending', NULL, NULL, NOW()
          )
          ON CONFLICT (user_id, professional_role) DO UPDATE SET
            registration_type = EXCLUDED.registration_type,
            registration_number = EXCLUDED.registration_number,
            registration_region = EXCLUDED.registration_region,
            status = 'pending', verified_at = NULL, verified_by = NULL, updated_at = NOW()
        `,
        txn`
          INSERT INTO user_roles (id, user_id, role, status, updated_at)
          VALUES (${randomUUID()}, ${identity.userId}, ${credential.professionalRole}, 'pending', NOW())
          ON CONFLICT (user_id, role) DO UPDATE SET status = 'pending', updated_at = NOW()
        `,
      ]),
    ]);
    await writeAuditLog(sql, {
      actorUserId: identity.userId,
      subjectUserId: identity.userId,
      action: 'professional_profile.submitted',
      entityType: 'professional_profile',
      entityId: profileId,
      metadata: { status: 'pending', roles: credentials.map((credential) => credential.professionalRole) },
    });
    return res.status(201).json({
      id: profileId,
      status: 'pending',
      credentials: credentials.map((credential) => ({ role: credential.professionalRole, status: 'pending' })),
    });
  } catch (error) {
    console.error('Professional profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
