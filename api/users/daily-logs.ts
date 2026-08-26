import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { generalRateLimit } from '../middleware/rateLimit';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await generalRateLimit(req, res, async () => {
    try {
      const { userId, limit = 30 } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      const logs = await sql`
        SELECT
          dl.id as log_id, dl.date, dl.weight as log_weight, dl.notes,
          m.id as meal_id, m.name as meal_name, m.timing, m.time as meal_time,
          m.total_calories, m.total_protein, m.total_carbs, m.total_fat,
          mf.id as food_id, mf.food_id as food_ref_id, mf.food_name, mf.food_category,
          mf.grams, mf.calories, mf.protein, mf.carbs, mf.fat,
          w.id as workout_id, w.name as workout_name, w.type, w.duration, w.intensity, w.time as workout_time
        FROM daily_logs dl
        LEFT JOIN meals m ON m.daily_log_id = dl.id
        LEFT JOIN meal_foods mf ON mf.meal_id = m.id
        LEFT JOIN workouts w ON w.daily_log_id = dl.id
        WHERE dl.user_id = ${userId as string}
        ORDER BY dl.date DESC, m.id, w.id
        LIMIT ${Number(limit)}
      `;

      // Group the flat rows into structured DailyLog objects
      const logsMap = new Map<string, any>();
      const mealsMap = new Map<string, any>();

      for (const row of logs as any[]) {
        let log = logsMap.get(row.log_id);
        if (!log) {
          log = {
            date: row.date,
            meals: [],
            workouts: [],
            weight: row.log_weight || undefined,
            totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            notes: row.notes || undefined,
          };
          logsMap.set(row.log_id, log);
        }

        if (row.meal_id && !mealsMap.has(row.meal_id)) {
          const meal = {
            id: row.meal_id,
            name: row.meal_name,
            timing: row.timing,
            foods: [],
            totalMacros: {
              calories: row.total_calories || 0,
              protein: row.total_protein || 0,
              carbs: row.total_carbs || 0,
              fat: row.total_fat || 0,
            },
            time: row.meal_time || undefined,
          };
          mealsMap.set(row.meal_id, meal);
          log.meals.push(meal);
        }

        if (row.food_id && row.meal_id) {
          const meal = mealsMap.get(row.meal_id);
          if (meal) {
            const foodPortion = {
              food: {
                id: row.food_ref_id,
                name: row.food_name,
                category: row.food_category || '',
                macros: { calories: row.calories || 0, protein: row.protein || 0, carbs: row.carbs || 0, fat: row.fat || 0 },
              },
              grams: row.grams || 0,
              macros: { calories: row.calories || 0, protein: row.protein || 0, carbs: row.carbs || 0, fat: row.fat || 0 },
            };
            if (!meal.foods.some((f: any) => f.food.id === foodPortion.food.id && f.grams === foodPortion.grams)) {
              meal.foods.push(foodPortion);
            }
          }
        }

        if (row.workout_id) {
          if (!log.workouts.some((w: any) => w.id === row.workout_id)) {
            log.workouts.push({
              id: row.workout_id,
              name: row.workout_name,
              type: row.type,
              duration: row.duration || 0,
              intensity: row.intensity || 'medium',
              time: row.workout_time || undefined,
            });
          }
        }
      }

      const result: any[] = [];
      for (const log of logsMap.values()) {
        log.totalMacros = log.meals.reduce(
          (acc: any, m: any) => ({
            calories: acc.calories + m.totalMacros.calories,
            protein: acc.protein + m.totalMacros.protein,
            carbs: acc.carbs + m.totalMacros.carbs,
            fat: acc.fat + m.totalMacros.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        result.push(log);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Get daily logs error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
