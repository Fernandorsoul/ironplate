import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generalRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { customFoodPostSchema, userIdSchema, validationError } from '../middleware/validation';
import { requireUserAccess } from '../middleware/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'POST'])) return;

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

        const foods = await sql`
          SELECT * FROM custom_foods WHERE user_id = ${parsedUserId.data}
        `;

        const result = (foods as any[]).map(f => ({
          id: f.id,
          name: f.name,
          category: f.category,
          macros: { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat },
        }));

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get custom foods error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'POST') {
      try {
        const parsed = customFoodPostSchema.safeParse(req.body);
        if (!parsed.success) {
          return validationError(res, parsed.error.issues);
        }

        const { userId } = parsed.data;
        if (!await requireUserAccess(req, res, userId)) return;
        const food = parsed.data.food as Record<string, any>;

        // INSERT OR REPLACE (SQLite) is not valid PostgreSQL; use upsert semantics instead
        await sql`
          INSERT INTO custom_foods (id, user_id, name, category, calories, protein, carbs, fat)
          VALUES (${food.id}, ${userId}, ${food.name}, ${food.category}, ${food.macros.calories}, ${food.macros.protein}, ${food.macros.carbs}, ${food.macros.fat})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            calories = EXCLUDED.calories,
            protein = EXCLUDED.protein,
            carbs = EXCLUDED.carbs,
            fat = EXCLUDED.fat
          WHERE custom_foods.user_id = EXCLUDED.user_id
        `;

        return res.status(201).json({ success: true });
      } catch (error) {
        console.error('Save custom food error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
