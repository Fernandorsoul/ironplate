import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generalRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';

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

        const plans = await sql`
          SELECT * FROM meal_plans WHERE user_id = ${userId as string} ORDER BY created_at DESC
        `;

        const result = (plans as any[]).map(p => ({
          id: p.id,
          name: p.name,
          goal: p.goal,
          meals: JSON.parse(p.meals_json),
          totalMacros: { calories: p.total_calories, protein: p.total_protein, carbs: p.total_carbs, fat: p.total_fat },
          createdAt: p.created_at,
        }));

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get meal plans error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'POST') {
      try {
        const { userId, plan } = req.body;

        if (!userId || !plan) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        await sql`
          INSERT OR REPLACE INTO meal_plans (id, user_id, name, goal, total_calories, total_protein, total_carbs, total_fat, meals_json)
          VALUES (${plan.id}, ${userId}, ${plan.name}, ${plan.goal}, ${plan.totalMacros.calories}, ${plan.totalMacros.protein}, ${plan.totalMacros.carbs}, ${plan.totalMacros.fat}, ${JSON.stringify(plan.meals)})
        `;

        return res.status(201).json({ success: true });
      } catch (error) {
        console.error('Save meal plan error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
