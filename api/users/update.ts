import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generalRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { updateSchema, validationError } from '../middleware/validation';
import { requireAuth, requireUserAccess } from '../middleware/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['PUT'])) return;

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!await requireAuth(req, res)) return;

  const sql = getSql();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Apply rate limiting
  await generalRateLimit(req, res, async () => {
    try {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return validationError(res, parsed.error.issues);
      }

      const { userId, fields } = parsed.data;
      if (!await requireUserAccess(req, res, userId)) return;

      // Update each field individually using tagged template literals
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;

        switch (key) {
          case 'name':
            await sql`UPDATE users SET name = ${value}, updated_at = NOW() WHERE id = ${userId}`;
            break;
          case 'age':
            await sql`UPDATE users SET age = ${value}, updated_at = NOW() WHERE id = ${userId}`;
            break;
          case 'weight':
            await sql`UPDATE users SET weight = ${value}, updated_at = NOW() WHERE id = ${userId}`;
            break;
          case 'height':
            await sql`UPDATE users SET height = ${value}, updated_at = NOW() WHERE id = ${userId}`;
            break;
          case 'gender':
            await sql`UPDATE users SET gender = ${value}, updated_at = NOW() WHERE id = ${userId}`;
            break;
          case 'activityLevel':
            // Map camelCase to snake_case
            await sql`UPDATE users SET activity_level = ${value}, updated_at = NOW() WHERE id = ${userId}`;
            break;
          case 'goal':
            await sql`UPDATE users SET goal = ${value}, updated_at = NOW() WHERE id = ${userId}`;
            break;
          case 'sport':
            await sql`UPDATE users SET sport = ${value}, updated_at = NOW() WHERE id = ${userId}`;
            break;
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
