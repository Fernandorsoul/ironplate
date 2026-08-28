import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generalRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { deleteMealPlanSchema, mealPlanPostSchema, userIdSchema, validationError } from '../middleware/validation';
import { requireUserAccess } from '../middleware/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'POST', 'DELETE'])) return;

  const sql = getSql();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  await generalRateLimit(req, res, async () => {
    if (req.method === 'GET') {
      try {
        const { userId } = req.query;

        if (!userId) {
          return res.status(400).json({ error: 'Missing userId parameter' });
        }

        const parsedUserId = userIdSchema.safeParse(userId);
        if (!parsedUserId.success) {
          return validationError(res, parsedUserId.error.issues);
        }
        if (!await requireUserAccess(req, res, parsedUserId.data)) return;

        const plans = await sql`
          SELECT * FROM meal_plans WHERE user_id = ${parsedUserId.data} ORDER BY created_at DESC
        `;

        const result = (plans as any[]).map(p => ({
          id: p.id,
          name: p.name,
          goal: p.goal,
          meals: JSON.parse(p.meals_json),
          totalMacros: { calories: p.total_calories, protein: p.total_protein, carbs: p.total_carbs, fat: p.total_fat },
          createdAt: p.created_at,
          isActive: p.is_active,
        }));

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get meal plans error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'POST') {
      try {
        const parsed = mealPlanPostSchema.safeParse(req.body);
        if (!parsed.success) {
          return validationError(res, parsed.error.issues);
        }

        const { userId } = parsed.data;
        if (!await requireUserAccess(req, res, userId)) return;
        const plan = parsed.data.plan as Record<string, any>;

        // INSERT OR REPLACE (SQLite) is not valid PostgreSQL; use upsert semantics instead
        await sql`
          INSERT INTO meal_plans (id, user_id, name, goal, total_calories, total_protein, total_carbs, total_fat, meals_json, is_active, created_at, updated_at)
          VALUES (${plan.id}, ${userId}, ${plan.name}, ${plan.goal}, ${plan.totalMacros.calories}, ${plan.totalMacros.protein}, ${plan.totalMacros.carbs}, ${plan.totalMacros.fat}, ${JSON.stringify(plan.meals)}, ${plan.isActive || false}, ${plan.createdAt}, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            goal = EXCLUDED.goal,
            total_calories = EXCLUDED.total_calories,
            total_protein = EXCLUDED.total_protein,
            total_carbs = EXCLUDED.total_carbs,
            total_fat = EXCLUDED.total_fat,
            meals_json = EXCLUDED.meals_json,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
          WHERE meal_plans.user_id = EXCLUDED.user_id
        `;

        return res.status(201).json({ success: true });
      } catch (error) {
        console.error('Save meal plan error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const parsed = deleteMealPlanSchema.safeParse(req.body);
        if (!parsed.success) {
          return validationError(res, parsed.error.issues);
        }
        if (!await requireUserAccess(req, res, parsed.data.userId)) return;

        const deleted = await sql`
          DELETE FROM meal_plans
          WHERE id = ${parsed.data.planId} AND user_id = ${parsed.data.userId}
          RETURNING id
        `;
        if (deleted.length === 0) {
          return res.status(404).json({ error: 'Meal plan not found' });
        }
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Delete meal plan error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
