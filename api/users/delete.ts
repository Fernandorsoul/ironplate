import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { userIdSchema, validationError } from '../middleware/validation';
import { requireUserAccess } from '../middleware/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['DELETE'])) return;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getSql();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const parsedUserId = userIdSchema.safeParse(userId);
    if (!parsedUserId.success) {
      return validationError(res, parsedUserId.error.issues);
    }

    const id = parsedUserId.data;
    if (!await requireUserAccess(req, res, id)) return;

    // Verificar se o usuário existe
    const users = await sql`
      SELECT id FROM users WHERE id = ${id}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Deletar dados relacionados em ordem (devido a foreign keys)
    // 1. Deletar refeições e alimentos
    await sql`DELETE FROM meal_foods WHERE meal_id IN (SELECT id FROM meals WHERE user_id = ${id})`;
    await sql`DELETE FROM meals WHERE user_id = ${id}`;

    // 2. Deletar histórico de peso
    await sql`DELETE FROM weight_history WHERE user_id = ${id}`;

    // 3. Deletar medidas corporais
    await sql`DELETE FROM body_measurements WHERE user_id = ${id}`;

    // 4. Deletar alimentos customizados
    await sql`DELETE FROM custom_foods WHERE user_id = ${id}`;

    // 5. Deletar planos de refeição
    await sql`DELETE FROM meal_plans WHERE user_id = ${id}`;

    // 6. Deletar logs diários
    await sql`
      DELETE FROM professional_training_executions
      WHERE student_id = ${id}
         OR plan_version_id IN (
           SELECT v.id
           FROM professional_training_plan_versions v
           JOIN professional_training_plans p ON p.id = v.plan_id
           WHERE p.professional_id = ${id}
         )
    `;
    await sql`
      DELETE FROM professional_notifications
      WHERE recipient_user_id = ${id} OR actor_user_id = ${id}
         OR appointment_id IN (
           SELECT id FROM professional_appointments
           WHERE professional_id = ${id} OR student_id = ${id}
         )
    `;
    await sql`
      DELETE FROM professional_appointment_events
      WHERE appointment_id IN (
        SELECT id FROM professional_appointments
        WHERE professional_id = ${id} OR student_id = ${id}
      )
    `;
    await sql`DELETE FROM professional_appointments WHERE professional_id = ${id} OR student_id = ${id}`;
    await sql`DELETE FROM professional_schedule_blockouts WHERE professional_id = ${id}`;
    await sql`DELETE FROM professional_availability_rules WHERE professional_id = ${id}`;
    await sql`DELETE FROM professional_training_plans WHERE professional_id = ${id} OR student_id = ${id}`;
    await sql`DELETE FROM professional_nutrition_plans WHERE professional_id = ${id} OR student_id = ${id}`;
    await sql`DELETE FROM professional_exercises WHERE owner_professional_id = ${id}`;

    // 7. Deletar logs diários
    await sql`DELETE FROM daily_logs WHERE user_id = ${id}`;

    // 8. Deletar o usuário
    await sql`DELETE FROM users WHERE id = ${id}`;

    return res.status(200).json({
      success: true,
      message: 'Account and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
