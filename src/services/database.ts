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

    CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON daily_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_meals_log ON meals(daily_log_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_log ON workouts(daily_log_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_weight_user ON weight_history(user_id, date);
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

  await db!.runAsync(
    'INSERT OR REPLACE INTO custom_foods (id, user_id, name, category, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [food.id, userId, food.name, food.category, food.macros.calories, food.macros.protein, food.macros.carbs, food.macros.fat]
  );
}

export async function getCustomFoods(userId: string): Promise<Food[]> {
  if (!db) await initDatabase();

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

  await db!.runAsync(
    'INSERT INTO weight_history (id, user_id, date, weight, body_fat) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET weight = ?, body_fat = ?',
    [`${userId}_${entry.date}`, userId, entry.date, entry.weight, entry.bodyFat || null, entry.weight, entry.bodyFat || null]
  );
}

export async function getWeightHistory(userId: string): Promise<{ date: string; weight: number; bodyFat?: number }[]> {
  if (!db) await initDatabase();

  const entries = await db!.getAllAsync('SELECT * FROM weight_history WHERE user_id = ? ORDER BY date ASC', [userId]);

  return (entries as any[]).map(e => ({
    date: e.date,
    weight: e.weight,
    bodyFat: e.body_fat || undefined,
  }));
}
