import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generalRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { userIdSchema, validationError, weightEntryPostSchema } from '../middleware/validation';
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

        const entries = await sql`
          SELECT * FROM weight_history WHERE user_id = ${parsedUserId.data} ORDER BY date ASC
        `;

        const result = (entries as any[]).map(e => ({
          date: e.date,
          weight: e.weight,
          bodyFat: e.body_fat ?? undefined,
        }));

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get weight history error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'POST') {
      try {
        const parsed = weightEntryPostSchema.safeParse(req.body);
        if (!parsed.success) {
          return validationError(res, parsed.error.issues);
        }

        const { userId } = parsed.data;
        if (!await requireUserAccess(req, res, userId)) return;
        const entry = parsed.data.entry as Record<string, any>;

        const entryId = `${userId}_${entry.date}`;
        await sql.transaction(txn => [
          txn`
            INSERT INTO weight_history (id, user_id, date, weight, body_fat)
            VALUES (${entryId}, ${userId}, ${entry.date}, ${entry.weight}, ${entry.bodyFat ?? null})
            ON CONFLICT(user_id, date) DO UPDATE SET
              weight = EXCLUDED.weight,
              body_fat = COALESCE(EXCLUDED.body_fat, weight_history.body_fat)
          `,
          txn`
            INSERT INTO daily_logs (id, user_id, date, weight, updated_at)
            VALUES (${entryId}, ${userId}, ${entry.date}, ${entry.weight}, NOW())
            ON CONFLICT(user_id, date) DO UPDATE SET
              weight = EXCLUDED.weight,
              updated_at = NOW()
            WHERE daily_logs.user_id = EXCLUDED.user_id
          `,
        ]);

        return res.status(201).json({ success: true });
      } catch (error) {
        console.error('Save weight entry error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
