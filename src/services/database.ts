// SQLite Database Service for IronPlate
// Uses expo-sqlite (sync API) + expo-crypto for password hashing
// Web platform uses memory storage fallback

import * as Crypto from 'expo-crypto';
import { UserProfile, DailyLog, Meal, Workout, MealPlan, Food, Macros, FoodPortion } from '../types';
import { Platform } from 'react-native';
const isWeb = Platform.OS === 'web';


// In-memory storage for web platform
const memoryStore: Map<string, any[]> = new Map();

function getMemoryTable(tableName: string): any[] {
  if (!memoryStore.has(tableName)) memoryStore.set(tableName, []);
  return memoryStore.get(tableName)!;
}

// ============================================================
// DATABASE INITIALIZATION
// ============================================================

let db: any = null;

export async function initDatabase(): Promise<void> {
  if (isWeb) {
    console.log('Web platform — SQLite not available, using memory storage');
    return;
  }
  try {
    const SQLite = require('expo-sqlite');
    db = await SQLite.openDatabaseAsync('ironplate.db');
  } catch (e) {
    console.log('expo-sqlite not available');
    return;
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      age INTEGER,
      weight REAL,
      height REAL,
      gender TEXT DEFAULT 'male',
      activity_level TEXT DEFAULT 'moderate',
      goal TEXT DEFAULT 'maintenance',
      sport TEXT DEFAULT 'bodybuilding',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      weight REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      daily_log_id TEXT NOT NULL REFERENCES daily_logs(id),
      name TEXT NOT NULL,
      timing TEXT DEFAULT 'regular',
      total_calories REAL DEFAULT 0,
      total_protein REAL DEFAULT 0,
      total_carbs REAL DEFAULT 0,
      total_fat REAL DEFAULT 0,
      time TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_foods (
      id TEXT PRIMARY KEY,
      meal_id TEXT NOT NULL REFERENCES meals(id),
      food_id TEXT NOT NULL,
      food_name TEXT NOT NULL,
      food_category TEXT,
      grams REAL NOT NULL,
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      daily_log_id TEXT NOT NULL REFERENCES daily_logs(id),
      name TEXT NOT NULL,
      type TEXT DEFAULT 'strength',
      duration INTEGER DEFAULT 0,
      intensity TEXT DEFAULT 'medium',
      time TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      goal TEXT DEFAULT 'maintenance',
      total_calories REAL DEFAULT 0,
      total_protein REAL DEFAULT 0,
      total_carbs REAL DEFAULT 0,
      total_fat REAL DEFAULT 0,
      meals_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS custom_foods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Outro',
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS weight_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      weight REAL NOT NULL,
      body_fat REAL,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS body_measurements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      weight REAL,
      height REAL,
      body_fat REAL,
      body_fat_method TEXT DEFAULT 'visual',
      -- Bioimpedance
      resistance REAL,
      reactance REAL,
      phase_angle REAL,
      -- Skinfolds (mm) - Padrão CREF
      triceps REAL,
      biceps REAL,
      subscapular REAL,
      suprailiac REAL,
      abdominal REAL,
      chest_skinfold REAL,
      axillary_mid REAL,
      thigh_skinfold REAL,
      calf_skinfold REAL,
      -- Circumferences (cm) - Padrão CREF
      -- Membro Superior
      arm_relaxed_right REAL,
      arm_relaxed_left REAL,
      arm_flexed_right REAL,
      arm_flexed_left REAL,
      forearm_right REAL,
      forearm_left REAL,
      wrist_right REAL,
      wrist_left REAL,
      -- Tronco
      chest_circumference REAL,
      waist_circumference REAL,
      abdomen_circumference REAL,
      hip_circumference REAL,
      -- Membro Inferior
      thigh_proximal_right REAL,
      thigh_proximal_left REAL,
      thigh_mid_right REAL,
      thigh_mid_left REAL,
      calf_right REAL,
      calf_left REAL,
      ankle_right REAL,
      ankle_left REAL,
      -- Calculated
      lean_mass REAL,
      fat_mass REAL,
      bmi REAL,
      waist_hip_ratio REAL,
      -- Notes
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON daily_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_meals_log ON meals(daily_log_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_log ON workouts(daily_log_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_weight_user ON weight_history(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON body_measurements(user_id, date);
  `);
}

// ============================================================
// AUTHENTICATION
// ============================================================

async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + 'ironplate_salt_2024'
  );
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<{ id: string; name: string; email: string } | null> {
  if (!db) await initDatabase();


  // Web fallback: use in-memory storage
  if (isWeb) {
    const users = getMemoryTable('users');
    const exists = users.find(u => u.email === email.toLowerCase().trim());
    if (exists) return null;
    const id = Crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const user = { id, name: name.trim(), email: email.toLowerCase().trim(), password_hash: passwordHash };
    users.push(user);

    console.log('Web createUser success:', { id, name: name.trim(), email: email.toLowerCase().trim() });
    return { id, name: name.trim(), email: email.toLowerCase().trim() };
  }

  try {
    const id = Crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await db!.runAsync(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [id, name.trim(), email.toLowerCase().trim(), passwordHash]
    );

    return { id, name: name.trim(), email: email.toLowerCase().trim() };
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) {
      return null; // Email already exists
    }
    throw error;
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ id: string; name: string; email: string } | null> {
  if (!db) await initDatabase();

  const passwordHash = await hashPassword(password);


  // Web fallback: use in-memory storage
  if (isWeb) {
    const users = getMemoryTable('users');
    const user = users.find(u => u.email === email.toLowerCase().trim() && u.password_hash === passwordHash);
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email };
  }
  const user = await db!.getFirstAsync(
    'SELECT id, name, email FROM users WHERE email = ? AND password_hash = ?',
    [email.toLowerCase().trim(), passwordHash]
  );

  return user as { id: string; name: string; email: string } | null;
}

// ============================================================
// USER PROFILE
// ============================================================

export async function getUserById(userId: string): Promise<UserProfile | null> {
  if (!db) await initDatabase();

  // Web fallback: use in-memory storage
  if (isWeb) {
    const users = getMemoryTable('users');
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    return {
      name: user.name,
      age: user.age || 0,
      weight: user.weight || 0,
      height: user.height || 0,
      gender: user.gender || 'male',
      activityLevel: user.activity_level || 'moderate',
      goal: user.goal || 'maintenance',
      sport: user.sport || 'bodybuilding',
    };
  }

  const user = await db!.getFirstAsync(
    'SELECT name, age, weight, height, gender, activity_level, goal, sport FROM users WHERE id = ?',
    [userId]
  );

  if (!user) return null;

  const u = user as any;
  return {
    name: u.name,
    age: u.age || 0,
    weight: u.weight || 0,
    height: u.height || 0,
    gender: u.gender || 'male',
    activityLevel: u.activity_level || 'moderate',
    goal: u.goal || 'maintenance',
    sport: u.sport || 'bodybuilding',
  };
}

export async function updateUser(
  userId: string,
  fields: Partial<UserProfile>
): Promise<void> {
  if (!db) await initDatabase();

  const updates: string[] = [];
  const values: any[] = [];

  if (fields.name !== undefined) { updates.push('name = ?'); values.push(fields.name); }
  if (fields.age !== undefined) { updates.push('age = ?'); values.push(fields.age); }
  if (fields.weight !== undefined) { updates.push('weight = ?'); values.push(fields.weight); }
  if (fields.height !== undefined) { updates.push('height = ?'); values.push(fields.height); }
  if (fields.gender !== undefined) { updates.push('gender = ?'); values.push(fields.gender); }
  if (fields.activityLevel !== undefined) { updates.push('activity_level = ?'); values.push(fields.activityLevel); }
  if (fields.goal !== undefined) { updates.push('goal = ?'); values.push(fields.goal); }
  if (fields.sport !== undefined) { updates.push('sport = ?'); values.push(fields.sport); }

  if (updates.length === 0) return;

  updates.push("updated_at = datetime('now')");
  values.push(userId);

  await db!.runAsync(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

// ============================================================
// DAILY LOGS
// ============================================================

export async function saveDailyLog(userId: string, log: DailyLog): Promise<void> {
  if (!db) await initDatabase();

  // Upsert daily log
  await db!.runAsync(
    `INSERT INTO daily_logs (id, user_id, date, weight, notes)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET weight = ?, notes = ?`,
    [
      `${userId}_${log.date}`, userId, log.date, log.weight || null, log.notes || null,
      log.weight || null, log.notes || null,
    ]
  );

  const logId = `${userId}_${log.date}`;

  // Delete existing meals and workouts for this log
  await db!.runAsync('DELETE FROM meal_foods WHERE meal_id IN (SELECT id FROM meals WHERE daily_log_id = ?)', [logId]);
  await db!.runAsync('DELETE FROM meals WHERE daily_log_id = ?', [logId]);
  await db!.runAsync('DELETE FROM workouts WHERE daily_log_id = ?', [logId]);

  // Insert meals
  for (const meal of log.meals) {
    await db!.runAsync(
      'INSERT INTO meals (id, daily_log_id, name, timing, total_calories, total_protein, total_carbs, total_fat, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [meal.id, logId, meal.name, meal.timing, meal.totalMacros.calories, meal.totalMacros.protein, meal.totalMacros.carbs, meal.totalMacros.fat, meal.time || null]
    );

    for (const food of meal.foods) {
      await db!.runAsync(
        'INSERT INTO meal_foods (id, meal_id, food_id, food_name, food_category, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`${meal.id}_${food.food.id}`, meal.id, food.food.id, food.food.name, food.food.category, food.grams, food.macros.calories, food.macros.protein, food.macros.carbs, food.macros.fat]
      );
    }
  }

  // Insert workouts
  for (const workout of log.workouts) {
    await db!.runAsync(
      'INSERT INTO workouts (id, daily_log_id, name, type, duration, intensity, time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [workout.id, logId, workout.name, workout.type, workout.duration, workout.intensity, workout.time || null]
    );
  }
}

export async function getDailyLogs(userId: string, limit: number = 30): Promise<DailyLog[]> {
  if (!db) await initDatabase();

  const logs = await db!.getAllAsync(
    'SELECT * FROM daily_logs WHERE user_id = ? ORDER BY date DESC LIMIT ?',
    [userId, limit]
  );

  const result: DailyLog[] = [];

  for (const log of logs as any[]) {
    const meals = await db!.getAllAsync('SELECT * FROM meals WHERE daily_log_id = ?', [log.id]) as any[];
    const workouts = await db!.getAllAsync('SELECT * FROM workouts WHERE daily_log_id = ?', [log.id]) as any[];

    const mealsWithFoods: Meal[] = [];
    for (const meal of meals) {
      const foods = await db!.getAllAsync('SELECT * FROM meal_foods WHERE meal_id = ?', [meal.id]) as any[];
      mealsWithFoods.push({
        id: meal.id,
        name: meal.name,
        timing: meal.timing,
        foods: foods.map((f: any) => ({
          food: { id: f.food_id, name: f.food_name, category: f.food_category, macros: { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat } },
          grams: f.grams,
          macros: { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat },
        })),
        totalMacros: { calories: meal.total_calories, protein: meal.total_protein, carbs: meal.total_carbs, fat: meal.total_fat },
        time: meal.time,
      });
    }

    const workoutsList: Workout[] = workouts.map((w: any) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      duration: w.duration,
      intensity: w.intensity,
      time: w.time,
    }));

    const totalMacros = mealsWithFoods.reduce(
      (acc, m) => ({
        calories: acc.calories + m.totalMacros.calories,
        protein: acc.protein + m.totalMacros.protein,
        carbs: acc.carbs + m.totalMacros.carbs,
        fat: acc.fat + m.totalMacros.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    result.push({
      date: log.date,
      meals: mealsWithFoods,
      workouts: workoutsList,
      weight: log.weight,
      totalMacros,
      notes: log.notes,
    });
  }

  return result;
}

// ============================================================
// MEAL PLANS
// ============================================================

export async function saveMealPlan(userId: string, plan: MealPlan): Promise<void> {
  if (!db) await initDatabase();

  await db!.runAsync(
    'INSERT OR REPLACE INTO meal_plans (id, user_id, name, goal, total_calories, total_protein, total_carbs, total_fat, meals_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [plan.id, userId, plan.name, plan.goal, plan.totalMacros.calories, plan.totalMacros.protein, plan.totalMacros.carbs, plan.totalMacros.fat, JSON.stringify(plan.meals)]
  );
}

export async function getMealPlans(userId: string): Promise<MealPlan[]> {
  if (!db) await initDatabase();

  const plans = await db!.getAllAsync('SELECT * FROM meal_plans WHERE user_id = ? ORDER BY created_at DESC', [userId]);

  return (plans as any[]).map(p => ({
    id: p.id,
    name: p.name,
    goal: p.goal,
    meals: JSON.parse(p.meals_json),
    totalMacros: { calories: p.total_calories, protein: p.total_protein, carbs: p.total_carbs, fat: p.total_fat },
    createdAt: p.created_at,
  }));
}

export async function deleteMealPlan(planId: string): Promise<void> {
  if (!db) await initDatabase();
  await db!.runAsync('DELETE FROM meal_plans WHERE id = ?', [planId]);
}

// ============================================================
// CUSTOM FOODS
// ============================================================

export async function saveCustomFood(userId: string, food: Food): Promise<void> {
  if (!db) await initDatabase();

  // Web fallback
  if (isWeb) {
    const foods = getMemoryTable('custom_foods');
    const existing = foods.findIndex(f => f.id === food.id && f.user_id === userId);
    const item = { id: food.id, user_id: userId, name: food.name, category: food.category, ...food.macros };
    if (existing >= 0) {
      foods[existing] = item;
    } else {
      foods.push(item);
    }
    return;
  }

  await db!.runAsync(
    'INSERT OR REPLACE INTO custom_foods (id, user_id, name, category, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [food.id, userId, food.name, food.category, food.macros.calories, food.macros.protein, food.macros.carbs, food.macros.fat]
  );
}

export async function getCustomFoods(userId: string): Promise<Food[]> {
  if (!db) await initDatabase();

  // Web fallback
  if (isWeb) {
    const foods = getMemoryTable('custom_foods');
    return foods.filter(f => f.user_id === userId).map(f => ({
      id: f.id,
      name: f.name,
      category: f.category,
      macros: { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat },
    }));
  }

  const foods = await db!.getAllAsync('SELECT * FROM custom_foods WHERE user_id = ?', [userId]);

  return (foods as any[]).map(f => ({
    id: f.id,
    name: f.name,
    category: f.category,
    macros: { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat },
  }));
}

// ============================================================
// WEIGHT HISTORY
// ============================================================

export async function saveWeightEntry(userId: string, entry: { date: string; weight: number; bodyFat?: number }): Promise<void> {
  if (!db) await initDatabase();

  // Web fallback
  if (isWeb) {
    const entries = getMemoryTable('weight_history');
    const existing = entries.findIndex(e => e.user_id === userId && e.date === entry.date);
    const item = { id: `${userId}_${entry.date}`, user_id: userId, date: entry.date, weight: entry.weight, body_fat: entry.bodyFat || null };
    if (existing >= 0) {
      entries[existing] = item;
    } else {
      entries.push(item);
    }
    return;
  }

  await db!.runAsync(
    'INSERT INTO weight_history (id, user_id, date, weight, body_fat) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET weight = ?, body_fat = ?',
    [`${userId}_${entry.date}`, userId, entry.date, entry.weight, entry.bodyFat || null, entry.weight, entry.bodyFat || null]
  );
}

export async function getWeightHistory(userId: string): Promise<{ date: string; weight: number; bodyFat?: number }[]> {
  if (!db) await initDatabase();

  // Web fallback
  if (isWeb) {
    const entries = getMemoryTable('weight_history');
    return entries.filter(e => e.user_id === userId).sort((a, b) => a.date.localeCompare(b.date)).map(e => ({
      date: e.date,
      weight: e.weight,
      bodyFat: e.body_fat || undefined,
    }));
  }

  const entries = await db!.getAllAsync('SELECT * FROM weight_history WHERE user_id = ? ORDER BY date ASC', [userId]);

  return (entries as any[]).map(e => ({
    date: e.date,
    weight: e.weight,
    bodyFat: e.body_fat || undefined,
  }));
}

// ============================================================
// BODY MEASUREMENTS
// ============================================================

export interface BodyMeasurement {
  date: string;
  weight: number;
  height?: number;
  bodyFat?: number;
  bodyFatMethod?: 'visual' | 'skinfold' | 'bioimpedance';
  // Bioimpedance
  resistance?: number;
  reactance?: number;
  phaseAngle?: number;
  // Skinfolds (mm) - Padrão CREF
  triceps?: number;
  biceps?: number;
  subscapular?: number;
  suprailiac?: number;
  abdominal?: number;
  chestSkinfold?: number;
  axillaryMid?: number;
  thighSkinfold?: number;
  calfSkinfold?: number;
  // Circumferences (cm) - Padrão CREF
  armRelaxedRight?: number;
  armRelaxedLeft?: number;
  armFlexedRight?: number;
  armFlexedLeft?: number;
  forearmRight?: number;
  forearmLeft?: number;
  wristRight?: number;
  wristLeft?: number;
  chestCircumference?: number;
  waistCircumference?: number;
  abdomenCircumference?: number;
  hipCircumference?: number;
  thighProximalRight?: number;
  thighProximalLeft?: number;
  thighMidRight?: number;
  thighMidLeft?: number;
  calfRight?: number;
  calfLeft?: number;
  ankleRight?: number;
  ankleLeft?: number;
  // Calculated
  leanMass?: number;
  fatMass?: number;
  bmi?: number;
  waistHipRatio?: number;
  notes?: string;
}

export async function saveBodyMeasurement(userId: string, measurement: BodyMeasurement): Promise<void> {
  if (!db) await initDatabase();

  const id = `${userId}_${measurement.date}`;
  const h = measurement.height || 170;
  const leanMass = measurement.weight * (1 - (measurement.bodyFat || 0) / 100);
  const fatMass = measurement.weight * ((measurement.bodyFat || 0) / 100);
  const bmi = measurement.weight / Math.pow(h / 100, 2);
  const waistHipRatio = (measurement.waistCircumference && measurement.hipCircumference) 
    ? measurement.waistCircumference / measurement.hipCircumference : undefined;

  const fields = [
    id, userId, measurement.date, measurement.weight, measurement.height || null,
    measurement.bodyFat || null, measurement.bodyFatMethod || 'visual',
    measurement.resistance || null, measurement.reactance || null, measurement.phaseAngle || null,
    measurement.triceps || null, measurement.biceps || null, measurement.subscapular || null,
    measurement.suprailiac || null, measurement.abdominal || null, measurement.chestSkinfold || null,
    measurement.axillaryMid || null, measurement.thighSkinfold || null, measurement.calfSkinfold || null,
    measurement.armRelaxedRight || null, measurement.armRelaxedLeft || null,
    measurement.armFlexedRight || null, measurement.armFlexedLeft || null,
    measurement.forearmRight || null, measurement.forearmLeft || null,
    measurement.wristRight || null, measurement.wristLeft || null,
    measurement.chestCircumference || null, measurement.waistCircumference || null,
    measurement.abdomenCircumference || null, measurement.hipCircumference || null,
    measurement.thighProximalRight || null, measurement.thighProximalLeft || null,
    measurement.thighMidRight || null, measurement.thighMidLeft || null,
    measurement.calfRight || null, measurement.calfLeft || null,
    measurement.ankleRight || null, measurement.ankleLeft || null,
    leanMass, fatMass, bmi, waistHipRatio || null, measurement.notes || null,
  ];

  if (isWeb) {
    const measurements = getMemoryTable('body_measurements');
    const existing = measurements.findIndex(m => m.user_id === userId && m.date === measurement.date);
    const item: any = {
      id, user_id: userId, date: measurement.date,
      weight: measurement.weight, height: measurement.height || null,
      body_fat: measurement.bodyFat || null, body_fat_method: measurement.bodyFatMethod || 'visual',
      resistance: measurement.resistance || null, reactance: measurement.reactance || null, phase_angle: measurement.phaseAngle || null,
      triceps: measurement.triceps || null, biceps: measurement.biceps || null,
      subscapular: measurement.subscapular || null, suprailiac: measurement.suprailiac || null,
      abdominal: measurement.abdominal || null, chest_skinfold: measurement.chestSkinfold || null,
      axillary_mid: measurement.axillaryMid || null, thigh_skinfold: measurement.thighSkinfold || null, calf_skinfold: measurement.calfSkinfold || null,
      arm_relaxed_right: measurement.armRelaxedRight || null, arm_relaxed_left: measurement.armRelaxedLeft || null,
      arm_flexed_right: measurement.armFlexedRight || null, arm_flexed_left: measurement.armFlexedLeft || null,
      forearm_right: measurement.forearmRight || null, forearm_left: measurement.forearmLeft || null,
      wrist_right: measurement.wristRight || null, wrist_left: measurement.wristLeft || null,
      chest_circumference: measurement.chestCircumference || null, waist_circumference: measurement.waistCircumference || null,
      abdomen_circumference: measurement.abdomenCircumference || null, hip_circumference: measurement.hipCircumference || null,
      thigh_proximal_right: measurement.thighProximalRight || null, thigh_proximal_left: measurement.thighProximalLeft || null,
      thigh_mid_right: measurement.thighMidRight || null, thigh_mid_left: measurement.thighMidLeft || null,
      calf_right: measurement.calfRight || null, calf_left: measurement.calfLeft || null,
      ankle_right: measurement.ankleRight || null, ankle_left: measurement.ankleLeft || null,
      lean_mass: leanMass, fat_mass: fatMass, bmi, waist_hip_ratio: waistHipRatio || null, notes: measurement.notes || null,
    };
    if (existing >= 0) { measurements[existing] = item; } else { measurements.push(item); }
    console.log('Web saveBodyMeasurement success:', measurement.date);
    return;
  }

  await db!.runAsync(
    `INSERT INTO body_measurements (id, user_id, date, weight, height, body_fat, body_fat_method, resistance, reactance, phase_angle, triceps, biceps, subscapular, suprailiac, abdominal, chest_skinfold, axillary_mid, thigh_skinfold, calf_skinfold, arm_relaxed_right, arm_relaxed_left, arm_flexed_right, arm_flexed_left, forearm_right, forearm_left, wrist_right, wrist_left, chest_circumference, waist_circumference, abdomen_circumference, hip_circumference, thigh_proximal_right, thigh_proximal_left, thigh_mid_right, thigh_mid_left, calf_right, calf_left, ankle_right, ankle_left, lean_mass, fat_mass, bmi, waist_hip_ratio, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id, date) DO UPDATE SET weight=excluded.weight, height=excluded.height, body_fat=excluded.body_fat, body_fat_method=excluded.body_fat_method, resistance=excluded.resistance, reactance=excluded.reactance, phase_angle=excluded.phase_angle, triceps=excluded.triceps, biceps=excluded.biceps, subscapular=excluded.subscapular, suprailiac=excluded.suprailiac, abdominal=excluded.abdominal, chest_skinfold=excluded.chest_skinfold, axillary_mid=excluded.axillary_mid, thigh_skinfold=excluded.thigh_skinfold, calf_skinfold=excluded.calf_skinfold, arm_relaxed_right=excluded.arm_relaxed_right, arm_relaxed_left=excluded.arm_relaxed_left, arm_flexed_right=excluded.arm_flexed_right, arm_flexed_left=excluded.arm_flexed_left, forearm_right=excluded.forearm_right, forearm_left=excluded.forearm_left, wrist_right=excluded.wrist_right, wrist_left=excluded.wrist_left, chest_circumference=excluded.chest_circumference, waist_circumference=excluded.waist_circumference, abdomen_circumference=excluded.abdomen_circumference, hip_circumference=excluded.hip_circumference, thigh_proximal_right=excluded.thigh_proximal_right, thigh_proximal_left=excluded.thigh_proximal_left, thigh_mid_right=excluded.thigh_mid_right, thigh_mid_left=excluded.thigh_mid_left, calf_right=excluded.calf_right, calf_left=excluded.calf_left, ankle_right=excluded.ankle_right, ankle_left=excluded.ankle_left, lean_mass=excluded.lean_mass, fat_mass=excluded.fat_mass, bmi=excluded.bmi, waist_hip_ratio=excluded.waist_hip_ratio, notes=excluded.notes`,
    fields
  );
}

export async function getBodyMeasurements(userId: string, limit: number = 30): Promise<BodyMeasurement[]> {
  if (!db) await initDatabase();

  if (isWeb) {
    const measurements = getMemoryTable('body_measurements');
    return measurements
      .filter(m => m.user_id === userId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
      .map(m => mapMeasurement(m));
  }

  const entries = await db!.getAllAsync(
    'SELECT * FROM body_measurements WHERE user_id = ? ORDER BY date DESC LIMIT ?',
    [userId, limit]
  );

  return (entries as any[]).map(m => mapMeasurement(m));
}

function mapMeasurement(m: any): BodyMeasurement {
  return {
    date: m.date, weight: m.weight, height: m.height || undefined,
    bodyFat: m.body_fat || undefined, bodyFatMethod: m.body_fat_method || undefined,
    resistance: m.resistance || undefined, reactance: m.reactance || undefined, phaseAngle: m.phase_angle || undefined,
    triceps: m.triceps || undefined, biceps: m.biceps || undefined,
    subscapular: m.subscapular || undefined, suprailiac: m.suprailiac || undefined,
    abdominal: m.abdominal || undefined, chestSkinfold: m.chest_skinfold || undefined,
    axillaryMid: m.axillary_mid || undefined, thighSkinfold: m.thigh_skinfold || undefined, calfSkinfold: m.calf_skinfold || undefined,
    armRelaxedRight: m.arm_relaxed_right || undefined, armRelaxedLeft: m.arm_relaxed_left || undefined,
    armFlexedRight: m.arm_flexed_right || undefined, armFlexedLeft: m.arm_flexed_left || undefined,
    forearmRight: m.forearm_right || undefined, forearmLeft: m.forearm_left || undefined,
    wristRight: m.wrist_right || undefined, wristLeft: m.wrist_left || undefined,
    chestCircumference: m.chest_circumference || undefined, waistCircumference: m.waist_circumference || undefined,
    abdomenCircumference: m.abdomen_circumference || undefined, hipCircumference: m.hip_circumference || undefined,
    thighProximalRight: m.thigh_proximal_right || undefined, thighProximalLeft: m.thigh_proximal_left || undefined,
    thighMidRight: m.thigh_mid_right || undefined, thighMidLeft: m.thigh_mid_left || undefined,
    calfRight: m.calf_right || undefined, calfLeft: m.calf_left || undefined,
    ankleRight: m.ankle_right || undefined, ankleLeft: m.ankle_left || undefined,
    leanMass: m.lean_mass || undefined, fatMass: m.fat_mass || undefined, bmi: m.bmi || undefined,
    waistHipRatio: m.waist_hip_ratio || undefined, notes: m.notes || undefined,
  };
}
