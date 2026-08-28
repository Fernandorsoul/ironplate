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

        const entries = await sql`
          SELECT * FROM weight_history WHERE user_id = ${userId as string} ORDER BY date ASC
        `;

        const result = (entries as any[]).map(e => ({
          date: e.date,
          weight: e.weight,
          bodyFat: e.body_fat || undefined,
        }));

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get weight history error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'POST') {
      try {
        const { userId, entry } = req.body;

        if (!userId || !entry) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        await sql`
          INSERT INTO weight_history (id, user_id, date, weight, body_fat)
          VALUES (${`${userId}_${entry.date}`}, ${userId}, ${entry.date}, ${entry.weight}, ${entry.bodyFat || null})
          ON CONFLICT(user_id, date) DO UPDATE SET weight = ${entry.weight}, body_fat = ${entry.bodyFat || null}
        `;

        return res.status(201).json({ success: true });
      } catch (error) {
        console.error('Save weight entry error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
