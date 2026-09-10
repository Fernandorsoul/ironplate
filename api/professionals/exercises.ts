import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { generalRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import {
  professionalExercisePostSchema,
  professionalExercisePutSchema,
  validationError,
} from '../middleware/validation';
import { isApprovedEducator } from '../services/professionalAccess';
import { writeAuditLog } from '../services/audit';

function parseMuscleGroups(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function mapExercise(row: Record<string, any>) {
  return {
    id: row.id,
    visibility: row.visibility,
    name: row.name,
    description: row.description,
    muscleGroups: parseMuscleGroups(row.muscle_groups_json),
    equipment: row.equipment ?? undefined,
    modality: row.modality,
    instructions: row.instructions,
    mediaUrl: row.media_url ?? undefined,
    sourceAttribution: row.source_attribution ?? undefined,
    safetyNotes: row.safety_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
      const educator = await isApprovedEducator(sql, identity.userId);
      if (req.method === 'GET') {
        const rows = educator
          ? await sql`
              SELECT * FROM professional_exercises
              WHERE visibility = 'global' OR owner_professional_id = ${identity.userId}
              ORDER BY visibility, name
            `
          : await sql`
              SELECT * FROM professional_exercises
              WHERE visibility = 'global'
                 OR EXISTS (
                   SELECT 1
                   FROM professional_training_plans p
                   JOIN professional_training_plan_versions v
                     ON v.plan_id = p.id AND v.version = p.published_version AND v.status = 'published'
                   JOIN professional_student_links l
                     ON l.id = p.link_id AND l.status = 'active'
                   JOIN LATERAL (
                     SELECT status, scopes_json, expires_at
                     FROM consent_records
                     WHERE link_id = l.id
                     ORDER BY created_at DESC, id DESC
                     LIMIT 1
                   ) c ON c.status = 'granted'
                     AND c.scopes_json::jsonb ? 'prescribed_training'
                   CROSS JOIN LATERAL jsonb_array_elements(v.sessions_json::jsonb) session
                   CROSS JOIN LATERAL jsonb_array_elements(session->'items') item
                   WHERE p.student_id = ${identity.userId}
                     AND p.status = 'published'
                     AND (l.expires_at IS NULL OR l.expires_at > NOW())
                     AND (c.expires_at IS NULL OR c.expires_at > NOW())
                     AND (
                       item->>'exerciseId' = professional_exercises.id
                       OR item->>'alternativeExerciseId' = professional_exercises.id
                     )
                 )
              ORDER BY name
            `;
        return res.status(200).json((rows as Record<string, any>[]).map(mapExercise));
      }

      if (!educator) return res.status(403).json({ error: 'Approved CREF professional required' });

      if (req.method === 'POST') {
        const parsed = professionalExercisePostSchema.safeParse(req.body);
        if (!parsed.success) return validationError(res, parsed.error.issues);
        const exerciseId = randomUUID();
        await sql`
          INSERT INTO professional_exercises (
            id, owner_professional_id, visibility, name, description, muscle_groups_json,
            equipment, modality, instructions, media_url, source_attribution, safety_notes
          ) VALUES (
            ${exerciseId}, ${identity.userId}, 'private', ${parsed.data.name},
            ${parsed.data.description}, ${JSON.stringify(parsed.data.muscleGroups)},
            ${parsed.data.equipment ?? null}, ${parsed.data.modality}, ${parsed.data.instructions},
            ${parsed.data.mediaUrl ?? null}, ${parsed.data.sourceAttribution ?? null},
            ${parsed.data.safetyNotes ?? null}
          )
        `;
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          action: 'professional_exercise.created',
          entityType: 'professional_exercise',
          entityId: exerciseId,
          metadata: { visibility: 'private' },
        });
        return res.status(201).json({ id: exerciseId, visibility: 'private' });
      }

      const parsed = professionalExercisePutSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error.issues);
      const updated = await sql`
        UPDATE professional_exercises
        SET name = ${parsed.data.name}, description = ${parsed.data.description},
            muscle_groups_json = ${JSON.stringify(parsed.data.muscleGroups)},
            equipment = ${parsed.data.equipment ?? null}, modality = ${parsed.data.modality},
            instructions = ${parsed.data.instructions}, media_url = ${parsed.data.mediaUrl ?? null},
            source_attribution = ${parsed.data.sourceAttribution ?? null},
            safety_notes = ${parsed.data.safetyNotes ?? null}, updated_at = NOW()
        WHERE id = ${parsed.data.exerciseId} AND owner_professional_id = ${identity.userId}
          AND visibility = 'private'
        RETURNING id
      `;
      if (updated.length === 0) return res.status(404).json({ error: 'Private exercise not found' });
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        action: 'professional_exercise.updated',
        entityType: 'professional_exercise',
        entityId: parsed.data.exerciseId,
      });
      return res.status(200).json({ id: parsed.data.exerciseId, visibility: 'private' });
    } catch (error) {
      console.error('Professional exercises error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
