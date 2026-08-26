import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { generalRateLimit } from '../middleware/rateLimit';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await generalRateLimit(req, res, async () => {
    if (req.method === 'GET') {
      try {
        const { userId } = req.query;

        if (!userId) {
          return res.status(400).json({ error: 'Missing userId parameter' });
        }

        const foods = await sql`
          SELECT * FROM custom_foods WHERE user_id = ${userId as string}
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
        const { userId, food } = req.body;

        if (!userId || !food) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        await sql`
          INSERT OR REPLACE INTO custom_foods (id, user_id, name, category, calories, protein, carbs, fat)
          VALUES (${food.id}, ${userId}, ${food.name}, ${food.category}, ${food.macros.calories}, ${food.macros.protein}, ${food.macros.carbs}, ${food.macros.fat})
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
