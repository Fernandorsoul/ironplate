import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../middleware/auth';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { rateLimit } from '../middleware/rateLimit';
import { buildExportPayload, parseMealsJson } from '../services/exportData';

const exportRateLimit = rateLimit({
  maxRequests: 1,
  windowMs: 60 * 60 * 1000,
  message: 'Export allowed once per hour. Try again later.',
  identity: req => typeof (req as any).auth?.userId === 'string'
    ? (req as any).auth.userId
    : null,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET'])) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  await exportRateLimit(req, res, async () => {
    try {
      const userId = identity.userId;
      const [users, logRows, mealRows, foodRows, workoutRows, weightRows, measurementRows, customFoodRows, planRows] = await Promise.all([
        sql`
          SELECT id, name, email, created_at, updated_at, last_login,
                 age, weight, height, gender, activity_level, goal, sport
          FROM users WHERE id = ${userId}
        `,
        sql`SELECT id, date, weight, notes FROM daily_logs WHERE user_id = ${userId} ORDER BY date ASC`,
        sql`SELECT * FROM meals WHERE user_id = ${userId} ORDER BY daily_log_id, id`,
        sql`
          SELECT mf.* FROM meal_foods mf
          JOIN meals m ON m.id = mf.meal_id
          WHERE m.user_id = ${userId}
          ORDER BY mf.meal_id, mf.id
        `,
        sql`
          SELECT w.* FROM workouts w
          JOIN daily_logs dl ON dl.id = w.daily_log_id
          WHERE dl.user_id = ${userId}
          ORDER BY w.daily_log_id, w.id
        `,
        sql`SELECT * FROM weight_history WHERE user_id = ${userId} ORDER BY date ASC`,
        sql`SELECT * FROM body_measurements WHERE user_id = ${userId} ORDER BY date ASC`,
        sql`SELECT * FROM custom_foods WHERE user_id = ${userId} ORDER BY name ASC`,
        sql`SELECT * FROM meal_plans WHERE user_id = ${userId} ORDER BY created_at DESC`,
      ]);

      if (users.length === 0) return res.status(404).json({ error: 'User not found' });
      const row = users[0] as any;
      const mealsByLog = new Map<string, any[]>();
      const foodsByMeal = new Map<string, any[]>();
      const workoutsByLog = new Map<string, any[]>();

      for (const food of foodRows as any[]) {
        const foods = foodsByMeal.get(food.meal_id) || [];
        foods.push({
          food: {
            id: food.food_id,
            name: food.food_name,
            category: food.food_category || '',
            macros: { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat },
          },
          grams: food.grams,
          macros: { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat },
        });
        foodsByMeal.set(food.meal_id, foods);
      }

      for (const meal of mealRows as any[]) {
        const meals = mealsByLog.get(meal.daily_log_id) || [];
        meals.push({
          id: meal.id,
          name: meal.name,
          timing: meal.timing,
          time: meal.time || undefined,
          foods: foodsByMeal.get(meal.id) || [],
          totalMacros: {
            calories: meal.total_calories,
            protein: meal.total_protein,
            carbs: meal.total_carbs,
            fat: meal.total_fat,
          },
        });
        mealsByLog.set(meal.daily_log_id, meals);
      }

      for (const workout of workoutRows as any[]) {
        const workouts = workoutsByLog.get(workout.daily_log_id) || [];
        workouts.push({
          id: workout.id,
          name: workout.name,
          type: workout.type,
          duration: workout.duration,
          intensity: workout.intensity,
          time: workout.time || undefined,
        });
        workoutsByLog.set(workout.daily_log_id, workouts);
      }

      const dailyLogs = (logRows as any[]).map(log => {
        const meals = mealsByLog.get(log.id) || [];
        return {
          date: log.date,
          weight: log.weight || undefined,
          notes: log.notes || undefined,
          meals,
          workouts: workoutsByLog.get(log.id) || [],
          totalMacros: meals.reduce((total, meal) => ({
            calories: total.calories + meal.totalMacros.calories,
            protein: total.protein + meal.totalMacros.protein,
            carbs: total.carbs + meal.totalMacros.carbs,
            fat: total.fat + meal.totalMacros.fat,
          }), { calories: 0, protein: 0, carbs: 0, fat: 0 }),
        };
      });

      return res.status(200).json(buildExportPayload({
        user: {
          id: row.id,
          name: row.name,
          email: row.email,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastLogin: row.last_login,
        },
        profile: {
          age: row.age || 0,
          weight: row.weight || 0,
          height: row.height || 0,
          gender: row.gender || 'male',
          activityLevel: row.activity_level || 'moderate',
          goal: row.goal || 'maintenance',
          sport: row.sport || 'bodybuilding',
        },
        dailyLogs,
        weightHistory: weightRows as any[],
        bodyMeasurements: measurementRows as any[],
        customFoods: customFoodRows as any[],
        mealPlans: (planRows as any[]).map(plan => ({
          ...plan,
          meals: parseMealsJson(plan.meals_json),
          meals_json: undefined,
        })),
      }));
    } catch (error) {
      console.error('Export user data error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
