import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { generalRateLimit } from '../middleware/rateLimit';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  await generalRateLimit(req, res, async () => {
    try {
      const { userId, fields } = req.body;

      if (!userId || !fields) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Map camelCase to snake_case
      const fieldMap: Record<string, string> = {
        activityLevel: 'activity_level',
      };

      // Update each field individually using tagged template literals
      const allowedFields = ['name', 'age', 'weight', 'height', 'gender', 'activity_level', 'goal', 'sport'];

      for (const [key, value] of Object.entries(fields)) {
        const dbField = fieldMap[key] || key;
        if (allowedFields.includes(dbField) && value !== undefined) {
          // Use tagged template literal for each field
          switch (dbField) {
            case 'name':
              await sql`UPDATE users SET name = ${value as string}, updated_at = NOW() WHERE id = ${userId}`;
              break;
            case 'age':
              await sql`UPDATE users SET age = ${value as number}, updated_at = NOW() WHERE id = ${userId}`;
              break;
            case 'weight':
              await sql`UPDATE users SET weight = ${value as number}, updated_at = NOW() WHERE id = ${userId}`;
              break;
            case 'height':
              await sql`UPDATE users SET height = ${value as number}, updated_at = NOW() WHERE id = ${userId}`;
              break;
            case 'gender':
              await sql`UPDATE users SET gender = ${value as string}, updated_at = NOW() WHERE id = ${userId}`;
              break;
            case 'activity_level':
              await sql`UPDATE users SET activity_level = ${value as string}, updated_at = NOW() WHERE id = ${userId}`;
              break;
            case 'goal':
              await sql`UPDATE users SET goal = ${value as string}, updated_at = NOW() WHERE id = ${userId}`;
              break;
            case 'sport':
              await sql`UPDATE users SET sport = ${value as string}, updated_at = NOW() WHERE id = ${userId}`;
              break;
          }
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
