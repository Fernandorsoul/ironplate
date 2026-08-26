import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { generalRateLimit } from '../middleware/rateLimit';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  await generalRateLimit(req, res, async () => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      const users = await sql`
        SELECT name, age, weight, height, gender, activity_level, goal, sport
        FROM users
        WHERE id = ${userId as string}
      `;

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' }); 
      }

      const user = users[0];
      return res.status(200).json({
        name: user.name,
        age: user.age || 0,
        weight: user.weight || 0,
        height: user.height || 0,
        gender: user.gender || 'male',
        activityLevel: user.activity_level || 'moderate',
        goal: user.goal || 'maintenance',
        sport: user.sport || 'bodybuilding',
      });
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
