import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { generalRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { professionalTrainingExecutionPostSchema, validationError } from '../middleware/validation';
import { getScopedActiveLink, isApprovedEducator } from '../services/professionalAccess';
import { writeAuditLog } from '../services/audit';

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapExecution(row: Record<string, any>) {
  return {
    id: row.id,
    planId: row.plan_id,
    version: row.version,
    sessionId: row.session_id,
    studentId: row.student_id,
    workoutId: row.workout_id ?? undefined,
    status: row.status,
    results: parseJsonArray(row.results_json),
    perceivedExertion: row.perceived_exertion ?? undefined,
    feedback: row.feedback ?? undefined,
    performedAt: row.performed_at,
    createdAt: row.created_at,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'POST'])) return;
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  await generalRateLimit(req, res, async () => {
    try {
      if (req.method === 'GET') {
        const educator = await isApprovedEducator(sql, identity.userId);
        const rows = educator
          ? await sql`
              SELECT e.*, p.id AS plan_id, v.version
              FROM professional_training_executions e
              JOIN professional_training_plan_versions v ON v.id = e.plan_version_id
              JOIN professional_training_plans p ON p.id = v.plan_id
              JOIN professional_student_links l ON l.id = p.link_id AND l.status = 'active'
              JOIN consent_records c
                ON c.link_id = l.id AND c.status = 'granted' AND c.scopes_json::jsonb ? 'training'
              WHERE p.professional_id = ${identity.userId}
              ORDER BY e.performed_at DESC
            `
          : await sql`
              SELECT e.*, p.id AS plan_id, v.version
              FROM professional_training_executions e
              JOIN professional_training_plan_versions v ON v.id = e.plan_version_id
              JOIN professional_training_plans p ON p.id = v.plan_id
              JOIN professional_student_links l ON l.id = p.link_id AND l.status = 'active'
              JOIN consent_records c
                ON c.link_id = l.id AND c.status = 'granted' AND c.scopes_json::jsonb ? 'training'
              WHERE e.student_id = ${identity.userId}
              ORDER BY e.performed_at DESC
            `;
        return res.status(200).json((rows as Record<string, any>[]).map(mapExecution));
      }

      const parsed = professionalTrainingExecutionPostSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error.issues);
      const versions = await sql`
        SELECT p.professional_id, p.student_id, v.id AS version_id, v.sessions_json
        FROM professional_training_plans p
        JOIN professional_training_plan_versions v ON v.plan_id = p.id
        WHERE p.id = ${parsed.data.planId}
          AND p.student_id = ${identity.userId}
          AND p.status = 'published'
          AND v.version = ${parsed.data.version}
          AND v.status = 'published'
      `;
      if (versions.length === 0) return res.status(404).json({ error: 'Published training plan version not found' });
      const planVersion = versions[0];
      if (!await getScopedActiveLink(sql, planVersion.professional_id, identity.userId, 'training')) {
        return res.status(403).json({ error: 'Active training consent required' });
      }

      const sessions = parseJsonArray(planVersion.sessions_json) as Array<{
        id?: unknown;
        items?: Array<{ id?: unknown }>;
      }>;
      const session = sessions.find((item) => item.id === parsed.data.sessionId);
      if (!session) return res.status(400).json({ error: 'Session is not part of this plan version' });
      const prescribedItemIds = new Set((session.items || []).map((item) => item.id));
      if (parsed.data.results.some((result) => !prescribedItemIds.has(result.itemId))) {
        return res.status(400).json({ error: 'Execution contains an item outside the prescribed session' });
      }

      if (parsed.data.workoutId) {
        const workouts = await sql`
          SELECT w.id
          FROM workouts w
          JOIN daily_logs d ON d.id = w.daily_log_id
          WHERE w.id = ${parsed.data.workoutId} AND d.user_id = ${identity.userId}
        `;
        if (workouts.length === 0) return res.status(404).json({ error: 'Workout log not found' });
      }

      const executionId = randomUUID();
      await sql`
        INSERT INTO professional_training_executions (
          id, plan_version_id, student_id, workout_id, session_id, status,
          results_json, perceived_exertion, feedback, performed_at
        ) VALUES (
          ${executionId}, ${planVersion.version_id}, ${identity.userId},
          ${parsed.data.workoutId ?? null}, ${parsed.data.sessionId}, ${parsed.data.status},
          ${JSON.stringify(parsed.data.results)}, ${parsed.data.perceivedExertion ?? null},
          ${parsed.data.feedback ?? null}, ${new Date(parsed.data.performedAt)}
        )
      `;
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        subjectUserId: identity.userId,
        action: 'professional_training_execution.recorded',
        entityType: 'professional_training_execution',
        entityId: executionId,
        metadata: { planId: parsed.data.planId, version: parsed.data.version },
      });
      return res.status(201).json({ id: executionId, status: parsed.data.status });
    } catch (error) {
      console.error('Professional training executions error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
