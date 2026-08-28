import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { rateLimit } from '../middleware/rateLimit';

// LGPD (Art. 18 V) data portability: allow at most 1 export per hour
const exportRateLimit = rateLimit({
  maxRequests: 1,
  windowMs: 60 * 60 * 1000,
  message: 'Export allowed once per hour. Try again later.',
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Builds the suggested file name for the exported data file.
 * Pure helper (unit-tested in __tests__/dataExport.test.ts).
 */
export function buildExportFileName(date: Date = new Date()): string {
  return `ironplate-export-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Safely parses the stored meals JSON of a meal plan.
 * Pure helper (unit-tested in __tests__/dataExport.test.ts).
 */
export function parseMealsJson(raw: unknown): any[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Assembles the final structured export payload.
 * Pure helper (unit-tested in __tests__/dataExport.test.ts).
 */
export function buildExportPayload(parts: {
  user: Record<string, unknown>;
  profile: Record<string, unknown>;
  dailyLogs: any[];
  weightHistory: any[];
  bodyMeasurements: any[];
  customFoods: any[];
  mealPlans: any[];
  exportedAt?: string;
}): Record<string, unknown> {
  return {
    exportedAt: parts.exportedAt ?? new Date().toISOString(),
    formatVersion: 1,
    user: parts.user,
    profile: parts.profile,
    dailyLogs: parts.dailyLogs,
    weightHistory: parts.weightHistory,
    bodyMeasurements: parts.bodyMeasurements,
    customFoods: parts.customFoods,
    mealPlans: parts.mealPlans,
  };
}

/**
 * Groups the flat daily-logs JOIN rows into structured DailyLog objects.
 * Same approach used by api/users/daily-logs.ts.
 */
function groupDailyLogRows(rows: any[]): any[] {
  const logsMap = new Map<string, any>();
  const mealsMap = new Map<string, any>();

  for (const row of rows) {
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

  return result;
}

function mapBodyMeasurement(m: any) {
  return {
    date: m.date,
    weight: m.weight,
    height: m.height || undefined,
    bodyFat: m.body_fat || undefined,
    bodyFatMethod: m.body_fat_method || 'visual',
    resistance: m.resistance || undefined,
    reactance: m.reactance || undefined,
    phaseAngle: m.phase_angle || undefined,
    muscleMass: m.muscle_mass || undefined,
    skeletalMuscle: m.skeletal_muscle || undefined,
    waterPercent: m.water_percent || undefined,
    waterKg: m.water_kg || undefined,
    boneMass: m.bone_mass || undefined,
    proteinPercent: m.protein_percent || undefined,
    proteinMass: m.protein_mass || undefined,
    basalMetabolism: m.basal_metabolism || undefined,
    visceralFat: m.visceral_fat || undefined,
    triceps: m.triceps || undefined,
    biceps: m.biceps || undefined,
    subscapular: m.subscapular || undefined,
    suprailiac: m.suprailiac || undefined,
    abdominal: m.abdominal || undefined,
    chestSkinfold: m.chest_skinfold || undefined,
    axillaryMid: m.axillary_mid || undefined,
    thighSkinfold: m.thigh_skinfold || undefined,
    calfSkinfold: m.calf_skinfold || undefined,
    armRelaxedRight: m.arm_relaxed_right || undefined,
    armRelaxedLeft: m.arm_relaxed_left || undefined,
    armFlexedRight: m.arm_flexed_right || undefined,
    armFlexedLeft: m.arm_flexed_left || undefined,
    forearmRight: m.forearm_right || undefined,
    forearmLeft: m.forearm_left || undefined,
    wristRight: m.wrist_right || undefined,
    wristLeft: m.wrist_left || undefined,
    chestCircumference: m.chest_circumference || undefined,
    waistCircumference: m.waist_circumference || undefined,
    abdomenCircumference: m.abdomen_circumference || undefined,
    hipCircumference: m.hip_circumference || undefined,
    thighProximalRight: m.thigh_proximal_right || undefined,
    thighProximalLeft: m.thigh_proximal_left || undefined,
    thighMidRight: m.thigh_mid_right || undefined,
    thighMidLeft: m.thigh_mid_left || undefined,
    calfRight: m.calf_right || undefined,
    calfLeft: m.calf_left || undefined,
    ankleRight: m.ankle_right || undefined,
    ankleLeft: m.ankle_left || undefined,
    leanMass: m.lean_mass || undefined,
    fatMass: m.fat_mass || undefined,
    bmi: m.bmi || undefined,
    waistHipRatio: m.waist_hip_ratio || undefined,
    notes: m.notes || undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting (max 1 export per hour)
  await exportRateLimit(req, res, async () => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      if (typeof userId !== 'string' || !UUID_REGEX.test(userId)) {
        return res.status(400).json({ error: 'Invalid userId format' });
      }

      const url = process.env.DATABASE_URL;
      if (!url) {
        return res.status(500).json({ error: 'Database not configured' });
      }

      const sql = neon(url);

      // User account + profile fields
      const users = await sql`
        SELECT id, name, email, created_at, updated_at, last_login,
               age, weight, height, gender, activity_level, goal, sport
        FROM users
        WHERE id = ${userId}
      `;

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userRow = users[0] as any;

      const user = {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        createdAt: userRow.created_at || null,
        updatedAt: userRow.updated_at || null,
        lastLogin: userRow.last_login || null,
      };

      const profile = {
        age: userRow.age || 0,
        weight: userRow.weight || 0,
        height: userRow.height || 0,
        gender: userRow.gender || 'male',
        activityLevel: userRow.activity_level || 'moderate',
        goal: userRow.goal || 'maintenance',
        sport: userRow.sport || 'bodybuilding',
      };

      // Daily logs with meals and workouts (full history)
      const logRows = await sql`
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
        WHERE dl.user_id = ${userId}
        ORDER BY dl.date ASC, m.id, w.id
      `;
      const dailyLogs = groupDailyLogRows(logRows as any[]);

      // Weight history (full history)
      const weightRows = await sql`
        SELECT * FROM weight_history WHERE user_id = ${userId} ORDER BY date ASC
      `;
      const weightHistory = (weightRows as any[]).map(e => ({
        date: e.date,
        weight: e.weight,
        bodyFat: e.body_fat || undefined,
      }));

      // Body measurements (full history)
      const measurementRows = await sql`
        SELECT * FROM body_measurements WHERE user_id = ${userId} ORDER BY date ASC
      `;
      const bodyMeasurements = (measurementRows as any[]).map(mapBodyMeasurement);

      // Custom foods
      const foodRows = await sql`
        SELECT * FROM custom_foods WHERE user_id = ${userId}
      `;
      const customFoods = (foodRows as any[]).map(f => ({
        id: f.id,
        name: f.name,
        category: f.category,
        macros: { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat },
      }));

      // Meal plans
      const planRows = await sql`
        SELECT * FROM meal_plans WHERE user_id = ${userId} ORDER BY created_at DESC
      `;
      const mealPlans = (planRows as any[]).map(p => ({
        id: p.id,
        name: p.name,
        goal: p.goal,
        meals: parseMealsJson(p.meals_json),
        totalMacros: { calories: p.total_calories, protein: p.total_protein, carbs: p.total_carbs, fat: p.total_fat },
        createdAt: p.created_at,
      }));

      const payload = buildExportPayload({
        user,
        profile,
        dailyLogs,
        weightHistory,
        bodyMeasurements,
        customFoods,
        mealPlans,
      });

      return res.status(200).json(payload);
    } catch (error) {
      console.error('Export user data error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
