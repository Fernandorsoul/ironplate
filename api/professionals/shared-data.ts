import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { requireAuth } from '../middleware/auth';
import { professionalConsentScopeSchema, userIdSchema, validationError } from '../middleware/validation';
import { authorizeUserDataAccess, type DataScope } from '../services/authorization';

async function readScopedData(sql: any, professionalId: string, studentId: string, scope: DataScope) {
  switch (scope) {
    case 'basic_profile':
      return sql`
        SELECT name, age, height, gender, activity_level, goal, sport
        FROM users WHERE id = ${studentId}
      `;
    case 'nutrition_data':
      return sql`
        SELECT age, weight, height, gender, activity_level, goal, target_weight_kg,
               hydration_goal_ml
        FROM users WHERE id = ${studentId}
      `;
    case 'meals_adherence':
      return sql`
        SELECT dl.date, dl.water_ml, m.id AS meal_id, m.name, m.timing, m.time,
               m.total_calories, m.total_protein, m.total_carbs, m.total_fat
        FROM daily_logs dl
        LEFT JOIN meals m ON m.daily_log_id = dl.id AND m.user_id = dl.user_id
        WHERE dl.user_id = ${studentId}
        ORDER BY dl.date DESC, m.id
      `;
    case 'meal_plans':
      return sql`
        SELECT id, name, goal, total_calories, total_protein, total_carbs, total_fat,
               meals_json, is_active, created_at, updated_at
        FROM meal_plans WHERE user_id = ${studentId}
        ORDER BY created_at DESC
      `;
    case 'weight':
      return sql`
        SELECT date, weight, body_fat
        FROM weight_history WHERE user_id = ${studentId}
        ORDER BY date DESC
      `;
    case 'body_measurements':
      return sql`
        SELECT id, user_id, date, weight, height, body_fat, body_fat_method,
               resistance, reactance, phase_angle,
               muscle_mass, skeletal_muscle, water_percent, water_kg,
               bone_mass, protein_percent, protein_mass, basal_metabolism, visceral_fat,
               triceps, biceps, subscapular, suprailiac, abdominal, chest_skinfold,
               axillary_mid, thigh_skinfold, calf_skinfold,
               arm_relaxed_right, arm_relaxed_left, arm_flexed_right, arm_flexed_left,
               forearm_right, forearm_left, wrist_right, wrist_left,
               chest_circumference, waist_circumference, abdomen_circumference, hip_circumference,
               thigh_proximal_right, thigh_proximal_left, thigh_mid_right, thigh_mid_left,
               calf_right, calf_left, ankle_right, ankle_left,
               lean_mass, fat_mass, bmi, waist_hip_ratio, notes, created_at
        FROM body_measurements
        WHERE user_id = ${studentId}
        ORDER BY date DESC
      `;
    case 'prescribed_training':
      return sql`
        SELECT p.id, p.title, p.objective, p.starts_on, p.ends_on, p.status,
               p.published_version, v.sessions_json, v.published_at
        FROM professional_training_plans p
        LEFT JOIN professional_training_plan_versions v
          ON v.plan_id = p.id AND v.version = p.published_version
        WHERE p.professional_id = ${professionalId} AND p.student_id = ${studentId}
        ORDER BY p.created_at DESC
      `;
    case 'training_execution':
      return sql`
        SELECT e.id, e.session_id, e.status, e.results_json, e.perceived_exertion,
               e.feedback, e.performed_at, p.id AS plan_id, p.title
        FROM professional_training_executions e
        JOIN professional_training_plan_versions v ON v.id = e.plan_version_id
        JOIN professional_training_plans p ON p.id = v.plan_id
        WHERE p.professional_id = ${professionalId} AND e.student_id = ${studentId}
        ORDER BY e.performed_at DESC
      `;
    case 'scheduling':
      return sql`
        SELECT id, appointment_type, starts_at, ends_at, time_zone, duration_minutes, status
        FROM professional_appointments
        WHERE professional_id = ${professionalId} AND student_id = ${studentId}
        ORDER BY starts_at DESC
      `;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET'])) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  const parsedStudentId = userIdSchema.safeParse(req.query.studentId);
  const parsedScope = professionalConsentScopeSchema.safeParse(req.query.scope);
  if (!parsedStudentId.success) return validationError(res, parsedStudentId.error.issues);
  if (!parsedScope.success) return validationError(res, parsedScope.error.issues);
  if (parsedStudentId.data === identity.userId) {
    return res.status(403).json({ error: 'Professional shared access requires a distinct student' });
  }

  try {
    const decision = await authorizeUserDataAccess(sql, {
      actorUserId: identity.userId,
      subjectUserId: parsedStudentId.data,
      scope: parsedScope.data,
      action: 'read',
    });
    if (!decision.allowed) return res.status(403).json({ error: 'Active consent for this category required' });

    const rows = await readScopedData(sql, identity.userId, parsedStudentId.data, parsedScope.data);
    return res.status(200).json({ scope: parsedScope.data, data: rows });
  } catch (error) {
    console.error('Professional shared data error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
