import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { generalRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import {
  professionalTrainingPlanPostSchema,
  professionalTrainingPlanPutSchema,
  validationError,
} from '../middleware/validation';
import { getScopedActiveLink, isApprovedEducator } from '../services/professionalAccess';
import { writeAuditLog } from '../services/audit';

function parseSessions(value: unknown): unknown[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapTrainingPlan(row: Record<string, any>) {
  return {
    id: row.id,
    professionalId: row.professional_id,
    studentId: row.student_id,
    title: row.title,
    objective: row.objective ?? undefined,
    startsOn: row.starts_on ?? undefined,
    endsOn: row.ends_on ?? undefined,
    status: row.status,
    version: row.version,
    versionId: row.version_id,
    sessions: parseSessions(row.sessions_json),
    changeSummary: row.change_summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

function collectExerciseIds(sessions: Array<{ items: Array<{ exerciseId: string; alternativeExerciseId?: string }> }>) {
  const ids = new Set<string>();
  for (const session of sessions) {
    for (const item of session.items) {
      ids.add(item.exerciseId);
      if (item.alternativeExerciseId) ids.add(item.alternativeExerciseId);
    }
  }
  return [...ids];
}

async function exercisesAreAccessible(sql: any, professionalId: string, exerciseIds: string[]) {
  if (exerciseIds.length === 0) return false;
  const rows = await sql`
    SELECT id FROM professional_exercises
    WHERE id = ANY(${exerciseIds})
      AND (visibility = 'global' OR owner_professional_id = ${professionalId})
  `;
  return new Set((rows as Array<{ id: string }>).map((row) => row.id)).size === exerciseIds.length;
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
              SELECT p.id, p.professional_id, p.student_id, p.title, p.objective,
                     p.starts_on, p.ends_on, p.status, p.updated_at, p.published_at,
                     v.id AS version_id, v.version, v.sessions_json, v.change_summary, v.created_at
              FROM professional_training_plans p
              JOIN professional_training_plan_versions v
                ON v.plan_id = p.id AND v.version = p.current_version
              WHERE p.professional_id = ${identity.userId}
              ORDER BY p.updated_at DESC
            `
          : await sql`
              SELECT p.id, p.professional_id, p.student_id, p.title, p.objective,
                     p.starts_on, p.ends_on, p.status, p.updated_at, p.published_at,
                     v.id AS version_id, v.version, v.sessions_json, v.change_summary, v.created_at
              FROM professional_training_plans p
              JOIN professional_training_plan_versions v
                ON v.plan_id = p.id AND v.version = p.published_version AND v.status = 'published'
              JOIN professional_student_links l
                ON l.id = p.link_id AND l.status = 'active'
              JOIN consent_records c
                ON c.link_id = l.id AND c.status = 'granted' AND c.scopes_json::jsonb ? 'training'
              WHERE p.student_id = ${identity.userId} AND p.status = 'published'
                AND (p.starts_on IS NULL OR p.starts_on <= CURRENT_DATE::text)
                AND (p.ends_on IS NULL OR p.ends_on >= CURRENT_DATE::text)
              ORDER BY p.published_at DESC
            `;
        return res.status(200).json((rows as Record<string, any>[]).map(mapTrainingPlan));
      }

      if (!educator) return res.status(403).json({ error: 'Approved CREF professional required' });

      if (req.method === 'POST') {
        const parsed = professionalTrainingPlanPostSchema.safeParse(req.body);
        if (!parsed.success) return validationError(res, parsed.error.issues);
        const linkId = await getScopedActiveLink(sql, identity.userId, parsed.data.studentId, 'training');
        if (!linkId) return res.status(403).json({ error: 'Active training consent required' });
        const exerciseIds = collectExerciseIds(parsed.data.sessions);
        if (!await exercisesAreAccessible(sql, identity.userId, exerciseIds)) {
          return res.status(400).json({ error: 'Training plan contains inaccessible exercises' });
        }

        const planId = randomUUID();
        const versionId = randomUUID();
        await sql.transaction((txn: any) => [
          txn`
            INSERT INTO professional_training_plans (
              id, professional_id, student_id, link_id, title, objective,
              starts_on, ends_on, status, current_version
            ) VALUES (
              ${planId}, ${identity.userId}, ${parsed.data.studentId}, ${linkId},
              ${parsed.data.title}, ${parsed.data.objective ?? null},
              ${parsed.data.startsOn ?? null}, ${parsed.data.endsOn ?? null}, 'draft', 1
            )
          `,
          txn`
            INSERT INTO professional_training_plan_versions (
              id, plan_id, version, sessions_json, change_summary, status, created_by
            ) VALUES (
              ${versionId}, ${planId}, 1, ${JSON.stringify(parsed.data.sessions)},
              ${parsed.data.changeSummary ?? null}, 'draft', ${identity.userId}
            )
          `,
        ]);
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          subjectUserId: parsed.data.studentId,
          action: 'professional_training_plan.created',
          entityType: 'professional_training_plan',
          entityId: planId,
          metadata: { version: 1 },
        });
        return res.status(201).json({ id: planId, version: 1, status: 'draft' });
      }

      const parsed = professionalTrainingPlanPutSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error.issues);
      const plans = await sql`
        SELECT id, student_id, current_version, published_version
        FROM professional_training_plans
        WHERE id = ${parsed.data.planId} AND professional_id = ${identity.userId}
      `;
      if (plans.length === 0) return res.status(404).json({ error: 'Training plan not found' });
      const plan = plans[0];
      if (!await getScopedActiveLink(sql, identity.userId, plan.student_id, 'training')) {
        return res.status(403).json({ error: 'Active training consent required' });
      }

      if (parsed.data.action === 'update') {
        const sessions = parsed.data.sessions!;
        const exerciseIds = collectExerciseIds(sessions);
        if (!await exercisesAreAccessible(sql, identity.userId, exerciseIds)) {
          return res.status(400).json({ error: 'Training plan contains inaccessible exercises' });
        }
        const nextVersion = Number(plan.current_version) + 1;
        await sql.transaction((txn: any) => [
          txn`
            INSERT INTO professional_training_plan_versions (
              id, plan_id, version, sessions_json, change_summary, status, created_by
            ) VALUES (
              ${randomUUID()}, ${plan.id}, ${nextVersion}, ${JSON.stringify(sessions)},
              ${parsed.data.changeSummary ?? null}, 'draft', ${identity.userId}
            )
          `,
          txn`
            UPDATE professional_training_plans
            SET title = ${parsed.data.title}, objective = ${parsed.data.objective ?? null},
                starts_on = ${parsed.data.startsOn ?? null}, ends_on = ${parsed.data.endsOn ?? null},
                status = CASE WHEN published_version IS NULL THEN 'draft' ELSE 'published' END,
                current_version = ${nextVersion}, updated_at = NOW()
            WHERE id = ${plan.id} AND professional_id = ${identity.userId}
          `,
        ]);
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          subjectUserId: plan.student_id,
          action: 'professional_training_plan.version_created',
          entityType: 'professional_training_plan',
          entityId: plan.id,
          metadata: { version: nextVersion },
        });
        return res.status(200).json({
          id: plan.id,
          version: nextVersion,
          status: plan.published_version == null ? 'draft' : 'published',
          versionStatus: 'draft',
        });
      }

      if (parsed.data.action === 'publish') {
        await sql.transaction((txn: any) => [
          txn`
            UPDATE professional_training_plan_versions
            SET status = 'published', published_at = NOW()
            WHERE plan_id = ${plan.id} AND version = ${plan.current_version}
          `,
          txn`
            UPDATE professional_training_plans
            SET status = 'published', published_version = current_version,
                published_at = NOW(), updated_at = NOW()
            WHERE id = ${plan.id} AND professional_id = ${identity.userId}
          `,
        ]);
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          subjectUserId: plan.student_id,
          action: 'professional_training_plan.published',
          entityType: 'professional_training_plan',
          entityId: plan.id,
          metadata: { version: plan.current_version },
        });
        return res.status(200).json({ id: plan.id, version: plan.current_version, status: 'published' });
      }

      await sql`
        UPDATE professional_training_plans SET status = 'archived', updated_at = NOW()
        WHERE id = ${plan.id} AND professional_id = ${identity.userId}
      `;
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        subjectUserId: plan.student_id,
        action: 'professional_training_plan.archived',
        entityType: 'professional_training_plan',
        entityId: plan.id,
      });
      return res.status(200).json({ id: plan.id, status: 'archived' });
    } catch (error) {
      console.error('Professional training plans error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
