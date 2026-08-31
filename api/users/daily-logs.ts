import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserAccess } from '../middleware/auth';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { generalRateLimit } from '../middleware/rateLimit';
import {
  calculateMacrosPer100Grams,
  normalizeMealFoods,
  roundMacros,
} from '../services/mealNutrition';
import {
  dailyLogPostSchema,
  limitSchema,
  userIdSchema,
  validationError,
} from '../middleware/validation';

function parseMuscleGroups(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : undefined;
  } catch {
    return undefined;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'POST'])) return;
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  await generalRateLimit(req, res, async () => {
    try {
      if (req.method === 'POST') {
        const parsed = dailyLogPostSchema.safeParse(req.body);
        if (!parsed.success) return validationError(res, parsed.error.issues);

        const { userId, log } = parsed.data;
        if (!await requireUserAccess(req, res, userId)) return;
        const logId = `${userId}_${log.date}`;
        const persistedMeals = log.meals.map(meal => {
          const { foods, totalMacros } = normalizeMealFoods(meal.foods);
          return {
            ...meal,
            foods,
            totalMacros,
          };
        });

        await sql.transaction(txn => [
          txn`
            INSERT INTO daily_logs (id, user_id, date, weight, notes, updated_at)
            VALUES (${logId}, ${userId}, ${log.date}, ${log.weight ?? null}, ${log.notes ?? null}, NOW())
            ON CONFLICT (id) DO UPDATE SET
              weight = EXCLUDED.weight,
              notes = EXCLUDED.notes,
              updated_at = NOW()
            WHERE daily_logs.user_id = EXCLUDED.user_id
          `,
          txn`
            DELETE FROM meal_foods
            WHERE meal_id IN (
              SELECT id FROM meals WHERE daily_log_id = ${logId} AND user_id = ${userId}
            )
          `,
          txn`DELETE FROM meals WHERE daily_log_id = ${logId} AND user_id = ${userId}`,
          txn`
            DELETE FROM workouts
            WHERE daily_log_id IN (
              SELECT id FROM daily_logs WHERE id = ${logId} AND user_id = ${userId}
            )
          `,
          ...(log.weight === undefined ? [] : [txn`
            INSERT INTO weight_history (id, user_id, date, weight)
            VALUES (${`${userId}_${log.date}`}, ${userId}, ${log.date}, ${log.weight})
            ON CONFLICT (user_id, date) DO UPDATE SET weight = EXCLUDED.weight
          `]),
          ...persistedMeals.flatMap(meal => [
            txn`
              INSERT INTO meals (
                id, daily_log_id, user_id, name, timing, time,
                total_calories, total_protein, total_carbs, total_fat
              ) VALUES (
                ${meal.id}, ${logId}, ${userId}, ${meal.name}, ${meal.timing}, ${meal.time ?? null},
                ${meal.totalMacros.calories}, ${meal.totalMacros.protein},
                ${meal.totalMacros.carbs}, ${meal.totalMacros.fat}
              )
            `,
            ...meal.foods.map((portion, index) => txn`
              INSERT INTO meal_foods (
                id, meal_id, food_id, food_name, food_category, grams, quantity, unit,
                calories, protein, carbs, fat
              ) VALUES (
                ${`${meal.id}_${index}`}, ${meal.id}, ${portion.food.id},
                ${portion.food.name}, ${portion.food.category}, ${portion.grams},
                ${portion.quantity ?? null}, ${portion.unit ?? null},
                ${portion.macros.calories}, ${portion.macros.protein},
                ${portion.macros.carbs}, ${portion.macros.fat}
              )
            `),
          ]),
          ...log.workouts.map(workout => txn`
            INSERT INTO workouts (
              id, daily_log_id, name, type, duration, intensity, time,
              split_id, split_day_id, muscle_groups_json
            )
            VALUES (
              ${workout.id}, ${logId}, ${workout.name}, ${workout.type},
              ${workout.duration}, ${workout.intensity}, ${workout.time ?? null},
              ${workout.splitId ?? null}, ${workout.splitDayId ?? null},
              ${workout.muscleGroups ? JSON.stringify(workout.muscleGroups) : null}
            )
          `),
        ]);

        return res.status(201).json({ success: true });
      }

      const parsedUserId = userIdSchema.safeParse(req.query.userId);
      if (!parsedUserId.success) return validationError(res, parsedUserId.error.issues);
      const parsedLimit = limitSchema.safeParse(req.query.limit ?? 30);
      if (!parsedLimit.success) return validationError(res, parsedLimit.error.issues);
      if (!await requireUserAccess(req, res, parsedUserId.data)) return;

      const rows = await sql`
        WITH selected_logs AS (
          SELECT *
          FROM daily_logs
          WHERE user_id = ${parsedUserId.data}
          ORDER BY date DESC
          LIMIT ${parsedLimit.data}
        )
        SELECT
          dl.id as log_id, dl.date, dl.weight as log_weight, dl.notes,
          m.id as meal_id, m.name as meal_name, m.timing, m.time as meal_time,
          m.total_calories, m.total_protein, m.total_carbs, m.total_fat,
          mf.id as food_id, mf.food_id as food_ref_id, mf.food_name, mf.food_category,
          mf.grams, mf.quantity, mf.unit, mf.calories, mf.protein, mf.carbs, mf.fat,
          w.id as workout_id, w.name as workout_name, w.type, w.duration,
          w.intensity, w.time as workout_time, w.split_id, w.split_day_id,
          w.muscle_groups_json
        FROM selected_logs dl
        LEFT JOIN meals m ON m.daily_log_id = dl.id
        LEFT JOIN meal_foods mf ON mf.meal_id = m.id
        LEFT JOIN workouts w ON w.daily_log_id = dl.id
        ORDER BY dl.date DESC, m.id, w.id
      `;

      const logsMap = new Map<string, any>();
      const mealsMap = new Map<string, any>();
      const mealFoodIds = new Map<string, Set<string>>();
      for (const row of rows as any[]) {
        let log = logsMap.get(row.log_id);
        if (!log) {
          log = {
            date: row.date,
            meals: [],
            workouts: [],
            weight: row.log_weight ?? undefined,
            totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            notes: row.notes ?? undefined,
          };
          logsMap.set(row.log_id, log);
        }

        if (row.meal_id && !mealsMap.has(row.meal_id)) {
          const meal = {
            id: row.meal_id,
            name: row.meal_name,
            timing: row.timing,
            foods: [],
            totalMacros: roundMacros({
              calories: row.total_calories || 0,
              protein: row.total_protein || 0,
              carbs: row.total_carbs || 0,
              fat: row.total_fat || 0,
            }),
            time: row.meal_time ?? undefined,
          };
          mealsMap.set(row.meal_id, meal);
          mealFoodIds.set(row.meal_id, new Set());
          log.meals.push(meal);
        }

        const meal = mealsMap.get(row.meal_id);
        const storedFoodIds = mealFoodIds.get(row.meal_id);
        if (row.food_id && meal && storedFoodIds && !storedFoodIds.has(row.food_id)) {
          storedFoodIds.add(row.food_id);
          const portionMacros = roundMacros({
            calories: row.calories || 0,
            protein: row.protein || 0,
            carbs: row.carbs || 0,
            fat: row.fat || 0,
          });
          meal.foods.push({
            food: {
              id: row.food_ref_id,
              name: row.food_name,
              category: row.food_category || '',
              macros: calculateMacrosPer100Grams(portionMacros, row.grams || 0),
            },
            grams: row.grams || 0,
            quantity: row.quantity ?? undefined,
            unit: row.unit ?? undefined,
            macros: portionMacros,
          });
        }

        if (row.workout_id && !log.workouts.some((item: any) => item.id === row.workout_id)) {
          log.workouts.push({
            id: row.workout_id,
            name: row.workout_name,
            type: row.type,
            duration: row.duration || 0,
            intensity: row.intensity || 'medium',
            time: row.workout_time ?? undefined,
            splitId: row.split_id ?? undefined,
            splitDayId: row.split_day_id ?? undefined,
            muscleGroups: parseMuscleGroups(row.muscle_groups_json),
          });
        }
      }

      for (const log of logsMap.values()) {
        for (const meal of log.meals) {
          if (meal.foods.length > 0) {
            meal.totalMacros = roundMacros(meal.foods.reduce(
              (total: any, portion: any) => ({
                calories: total.calories + portion.macros.calories,
                protein: total.protein + portion.macros.protein,
                carbs: total.carbs + portion.macros.carbs,
                fat: total.fat + portion.macros.fat,
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 },
            ));
          }
        }

        log.totalMacros = roundMacros(log.meals.reduce(
          (total: any, meal: any) => ({
            calories: total.calories + meal.totalMacros.calories,
            protein: total.protein + meal.totalMacros.protein,
            carbs: total.carbs + meal.totalMacros.carbs,
            fat: total.fat + meal.totalMacros.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        ));
      }

      return res.status(200).json([...logsMap.values()]);
    } catch (error) {
      console.error('Daily logs error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
