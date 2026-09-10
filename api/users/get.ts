import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generalRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { userIdSchema, validationError } from '../middleware/validation';
import { requireAuth, requireUserAccess } from '../middleware/auth';
import { handleProfessionalRoutes } from '../services/professionalRouter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.resource === 'professionals') {
    return handleProfessionalRoutes(req, res);
  }
  if (applyCors(req, res, ['GET'])) return;

  if (req.method !== 'GET') {
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
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      const parsedUserId = userIdSchema.safeParse(userId);
      if (!parsedUserId.success) {
        return validationError(res, parsedUserId.error.issues);
      }
      if (!await requireUserAccess(req, res, parsedUserId.data)) return;

      const users = await sql`
        SELECT name, email, role, age, weight, height, gender, activity_level, goal, sport, photo_uri,
               target_weight_kg, hydration_goal_ml
        FROM users
        WHERE id = ${parsedUserId.data}
      `;

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];
      const roleRows = await sql`
        SELECT role FROM user_roles
        WHERE user_id = ${parsedUserId.data} AND status = 'active'
        ORDER BY role
      `;
      return res.status(200).json({
        name: user.name,
        email: user.email,
        role: user.role || 'student',
        roles: (roleRows as Array<{ role: string }>).map((row) => row.role),
        age: user.age || 0,
        weight: user.weight || 0,
        height: user.height || 0,
        gender: user.gender || 'male',
        activityLevel: user.activity_level || 'moderate',
        goal: user.goal || 'maintenance',
        sport: user.sport || 'bodybuilding',
        photoUri: user.photo_uri || undefined,
        targetWeightKg: user.target_weight_kg || undefined,
        hydrationGoalMl: user.hydration_goal_ml || undefined,
      });
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
