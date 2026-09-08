import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { generalRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import {
  professionalNutritionPlanPostSchema,
  professionalNutritionPlanPutSchema,
  validationError,
} from '../middleware/validation';
import { writeAuditLog } from '../services/audit';

function parseMeals(value: unknown): unknown[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapPlan(row: Record<string, any>) {
  return {
    id: row.id,
    professionalId: row.professional_id,
    studentId: row.student_id,
    title: row.title,
    objective: row.objective ?? undefined,
    status: row.status,
    version: row.version,
    meals: parseMeals(row.meals_json),
    totalMacros: {
      calories: row.total_calories,
      protein: row.total_protein,
      carbs: row.total_carbs,
      fat: row.total_fat,
    },
    changeSummary: row.change_summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

async function getApprovedProfessional(sql: any, userId: string) {
  const rows = await sql`
    SELECT p.id
    FROM professional_profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ${userId} AND p.status = 'approved' AND u.role = 'professional'
  `;
  return rows.length > 0;
}

async function getActiveLink(sql: any, professionalId: string, studentId: string) {
  const rows = await sql`
    SELECT l.id
    FROM professional_student_links l
    JOIN consent_records c ON c.link_id = l.id
    WHERE l.professional_id = ${professionalId}
      AND l.student_id = ${studentId}
      AND l.status = 'active'
      AND c.status = 'granted'
  `;
  return rows[0]?.id as string | undefined;
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
      if (req.method === 'GET') {
        const professional = await getApprovedProfessional(sql, identity.userId);
        const rows = professional
          ? await sql`
              SELECT p.id, p.professional_id, p.student_id, p.title, p.objective, p.status,
                     p.updated_at, p.published_at, v.version, v.meals_json,
                     v.total_calories, v.total_protein, v.total_carbs, v.total_fat,
                     v.change_summary, v.created_at
              FROM professional_nutrition_plans p
              JOIN professional_nutrition_plan_versions v
                ON v.plan_id = p.id AND v.version = p.current_version
              WHERE p.professional_id = ${identity.userId}
              ORDER BY p.updated_at DESC
            `
          : await sql`
              SELECT p.id, p.professional_id, p.student_id, p.title, p.objective, p.status,
                     p.updated_at, p.published_at, v.version, v.meals_json,
                     v.total_calories, v.total_protein, v.total_carbs, v.total_fat,
                     v.change_summary, v.created_at
              FROM professional_nutrition_plans p
              JOIN professional_nutrition_plan_versions v
                ON v.plan_id = p.id AND v.version = p.current_version AND v.status = 'published'
              JOIN professional_student_links l
                ON l.id = p.link_id AND l.status = 'active'
              JOIN consent_records c
                ON c.link_id = l.id AND c.status = 'granted'
              WHERE p.student_id = ${identity.userId} AND p.status = 'published'
              ORDER BY p.published_at DESC
            `;
        return res.status(200).json((rows as Record<string, any>[]).map(mapPlan));
      }

      const professional = await getApprovedProfessional(sql, identity.userId);
      if (!professional) return res.status(403).json({ error: 'Approved professional profile required' });

      if (req.method === 'POST') {
        const parsed = professionalNutritionPlanPostSchema.safeParse(req.body);
        if (!parsed.success) return validationError(res, parsed.error.issues);
        const linkId = await getActiveLink(sql, identity.userId, parsed.data.studentId);
        if (!linkId) return res.status(403).json({ error: 'Active consent link required' });

        const planId = randomUUID();
        const versionId = randomUUID();
        await sql.transaction((txn: any) => [
          txn`
            INSERT INTO professional_nutrition_plans (
              id, professional_id, student_id, link_id, title, objective, status, current_version
            ) VALUES (
              ${planId}, ${identity.userId}, ${parsed.data.studentId}, ${linkId},
              ${parsed.data.title}, ${parsed.data.objective ?? null}, 'draft', 1
            )
          `,
          txn`
            INSERT INTO professional_nutrition_plan_versions (
              id, plan_id, version, meals_json, total_calories, total_protein,
              total_carbs, total_fat, change_summary, status, created_by
            ) VALUES (
              ${versionId}, ${planId}, 1, ${JSON.stringify(parsed.data.meals)},
              ${parsed.data.totalMacros.calories}, ${parsed.data.totalMacros.protein},
              ${parsed.data.totalMacros.carbs}, ${parsed.data.totalMacros.fat},
              ${parsed.data.changeSummary ?? null}, 'draft', ${identity.userId}
            )
          `,
        ]);
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          subjectUserId: parsed.data.studentId,
          action: 'professional_nutrition_plan.created',
          entityType: 'professional_nutrition_plan',
          entityId: planId,
          metadata: { version: 1 },
        });
        return res.status(201).json({ id: planId, version: 1, status: 'draft' });
      }

      const parsed = professionalNutritionPlanPutSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error.issues);
      const plans = await sql`
        SELECT id, student_id, current_version, status
        FROM professional_nutrition_plans
        WHERE id = ${parsed.data.planId} AND professional_id = ${identity.userId}
      `;
      if (plans.length === 0) return res.status(404).json({ error: 'Nutrition plan not found' });
      const plan = plans[0];
      if (!await getActiveLink(sql, identity.userId, plan.student_id)) {
        return res.status(403).json({ error: 'Active consent link required' });
      }

      if (parsed.data.action === 'update') {
        const nextVersion = Number(plan.current_version) + 1;
        await sql.transaction((txn: any) => [
          txn`
            INSERT INTO professional_nutrition_plan_versions (
              id, plan_id, version, meals_json, total_calories, total_protein,
              total_carbs, total_fat, change_summary, status, created_by
            ) VALUES (
              ${randomUUID()}, ${plan.id}, ${nextVersion}, ${JSON.stringify(parsed.data.meals)},
              ${parsed.data.totalMacros!.calories}, ${parsed.data.totalMacros!.protein},
              ${parsed.data.totalMacros!.carbs}, ${parsed.data.totalMacros!.fat},
              ${parsed.data.changeSummary ?? null}, 'draft', ${identity.userId}
            )
          `,
          txn`
            UPDATE professional_nutrition_plans
            SET title = ${parsed.data.title}, objective = ${parsed.data.objective ?? null},
                status = 'draft', current_version = ${nextVersion}, updated_at = NOW(),
                published_at = NULL
            WHERE id = ${plan.id} AND professional_id = ${identity.userId}
          `,
        ]);
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          subjectUserId: plan.student_id,
          action: 'professional_nutrition_plan.version_created',
          entityType: 'professional_nutrition_plan',
          entityId: plan.id,
          metadata: { version: nextVersion },
        });
        return res.status(200).json({ id: plan.id, version: nextVersion, status: 'draft' });
      }

      if (parsed.data.action === 'publish') {
        await sql.transaction((txn: any) => [
          txn`
            UPDATE professional_nutrition_plan_versions
            SET status = 'published', published_at = NOW()
            WHERE plan_id = ${plan.id} AND version = ${plan.current_version}
          `,
          txn`
            UPDATE professional_nutrition_plans
            SET status = 'published', published_at = NOW(), updated_at = NOW()
            WHERE id = ${plan.id} AND professional_id = ${identity.userId}
          `,
        ]);
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          subjectUserId: plan.student_id,
          action: 'professional_nutrition_plan.published',
          entityType: 'professional_nutrition_plan',
          entityId: plan.id,
          metadata: { version: plan.current_version },
        });
        return res.status(200).json({ id: plan.id, version: plan.current_version, status: 'published' });
      }

      await sql`
        UPDATE professional_nutrition_plans
        SET status = 'archived', updated_at = NOW()
        WHERE id = ${plan.id} AND professional_id = ${identity.userId}
      `;
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        subjectUserId: plan.student_id,
        action: 'professional_nutrition_plan.archived',
        entityType: 'professional_nutrition_plan',
        entityId: plan.id,
      });
      return res.status(200).json({ id: plan.id, status: 'archived' });
    } catch (error) {
      console.error('Professional nutrition plans error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
