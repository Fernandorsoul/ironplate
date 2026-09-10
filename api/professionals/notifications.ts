import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { generalRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { professionalNotificationPutSchema, validationError } from '../middleware/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'PUT'])) return;
  if (!['GET', 'PUT'].includes(req.method || '')) return res.status(405).json({ error: 'Method not allowed' });
  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  await generalRateLimit(req, res, async () => {
    try {
      if (req.method === 'GET') {
        const rows = await sql`
          SELECT id, appointment_id, notification_type, title, body, read_at, created_at
          FROM professional_notifications
          WHERE recipient_user_id = ${identity.userId}
          ORDER BY created_at DESC
          LIMIT 100
        `;
        return res.status(200).json((rows as Record<string, any>[]).map((row) => ({
          id: row.id,
          appointmentId: row.appointment_id ?? undefined,
          notificationType: row.notification_type,
          title: row.title,
          body: row.body,
          readAt: row.read_at ?? undefined,
          createdAt: row.created_at,
        })));
      }
      const parsed = professionalNotificationPutSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error.issues);
      const updated = await sql`
        UPDATE professional_notifications SET read_at = COALESCE(read_at, NOW())
        WHERE id = ${parsed.data.notificationId} AND recipient_user_id = ${identity.userId}
        RETURNING id, read_at
      `;
      if (updated.length === 0) return res.status(404).json({ error: 'Notification not found' });
      return res.status(200).json({ id: updated[0].id, readAt: updated[0].read_at });
    } catch (error) {
      console.error('Professional notifications error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
