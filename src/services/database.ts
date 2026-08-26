import { UserProfile, DailyLog, MealPlan, Food, Macros } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL
const API_BASE = '/api';

// AsyncStorage keys for offline cache
const CACHE_PREFIX = '@ironplate_cache_';

// Cache helpers
async function saveToCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to cache ${key}:`, error);
  }
}

async function loadFromCache<T>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ============================================================
// AUTHENTICATION
// ============================================================

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/users/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Create user error:', error);
      return null;
    }

    const user = await response.json();
    
    // Cache user data
    await saveToCache(`user_${user.id}`, user);
    
    return user;
  } catch (error) {
    console.error('Create user error:', error);
    return null;
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/users/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    
    // Cache user data
    await saveToCache(`user_${user.id}`, user);
    
    return user;
  } catch (error) {
    console.error('Authenticate user error:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/users/get-by-email?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Get user by email error:', error);
    return null;
  }
}

export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword }),
    });

    if (!response.ok) {
      throw new Error('Failed to reset password');
    }
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
}

// ============================================================
// USER PROFILE
// ============================================================

export async function getUserById(userId: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`${API_BASE}/users/get?userId=${encodeURIComponent(userId)}`);

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const profile = await response.json();
    
    // Cache profile
    await saveToCache(`profile_${userId}`, profile);
    
    return profile;
  } catch (error) {
    console.error('Get user by id error:', error);
    // Try cache
    return await loadFromCache<UserProfile>(`profile_${userId}`);
  }
}

export async function updateUser(
  userId: string,
  fields: Partial<UserProfile>
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/users/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fields }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    // Update cache
    const cached = await loadFromCache<UserProfile>(`profile_${userId}`);
    if (cached) {
      const updated = { ...cached, ...fields };
      await saveToCache(`profile_${userId}`, updated);
    }
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
}

// ============================================================
// DAILY LOGS
// ============================================================

export async function saveDailyLog(userId: string, log: DailyLog): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/users/daily-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, log }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    // Update cache
    const cached = await loadFromCache<DailyLog[]>(`daily_logs_${userId}`) || [];
    const filtered = cached.filter(l => l.date !== log.date);
    filtered.push(log);
    await saveToCache(`daily_logs_${userId}`, filtered);
  } catch (error) {
    console.error('Save daily log error:', error);
    throw error;
  }
}

export async function getDailyLogs(userId: string, limit: number = 30): Promise<DailyLog[]> {
  try {
    const response = await fetch(`${API_BASE}/users/daily-logs?userId=${encodeURIComponent(userId)}&limit=${limit}`);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const logs = await response.json();
    
    // Cache logs
    await saveToCache(`daily_logs_${userId}`, logs);
    
    return logs;
  } catch (error) {
    console.error('Get daily logs error:', error);
    // Try cache
    return await loadFromCache<DailyLog[]>(`daily_logs_${userId}`) || [];
  }
}

// ============================================================
// MEAL PLANS
// ============================================================

export async function saveMealPlan(userId: string, plan: MealPlan): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/users/meal-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, plan }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    // Update cache
    const cached = await loadFromCache<MealPlan[]>(`meal_plans_${userId}`) || [];
    const filtered = cached.filter(p => p.id !== plan.id);
    filtered.push(plan);
    await saveToCache(`meal_plans_${userId}`, filtered);
  } catch (error) {
    console.error('Save meal plan error:', error);
    throw error;
  }
}

export async function getMealPlans(userId: string): Promise<MealPlan[]> {
  try {
    const response = await fetch(`${API_BASE}/users/meal-plans?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const plans = await response.json();
    
    // Cache plans
    await saveToCache(`meal_plans_${userId}`, plans);
    
    return plans;
  } catch (error) {
    console.error('Get meal plans error:', error);
    // Try cache
    return await loadFromCache<MealPlan[]>(`meal_plans_${userId}`) || [];
  }
}

export async function deleteMealPlan(planId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/users/meal-plans/${planId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
  } catch (error) {
    console.error('Delete meal plan error:', error);
    throw error;
  }
}

// ============================================================
// CUSTOM FOODS
// ============================================================

export async function saveCustomFood(userId: string, food: Food): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/users/custom-foods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, food }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    // Update cache
    const cached = await loadFromCache<Food[]>(`custom_foods_${userId}`) || [];
    const filtered = cached.filter(f => f.id !== food.id);
    filtered.push(food);
    await saveToCache(`custom_foods_${userId}`, filtered);
  } catch (error) {
    console.error('Save custom food error:', error);
    throw error;
  }
}

export async function getCustomFoods(userId: string): Promise<Food[]> {
  try {
    const response = await fetch(`${API_BASE}/users/custom-foods?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const foods = await response.json();
    
    // Cache foods
    await saveToCache(`custom_foods_${userId}`, foods);
    
    return foods;
  } catch (error) {
    console.error('Get custom foods error:', error);
    // Try cache
    return await loadFromCache<Food[]>(`custom_foods_${userId}`) || [];
  }
}

// ============================================================
// WEIGHT HISTORY
// ============================================================

export async function saveWeightEntry(userId: string, entry: { date: string; weight: number; bodyFat?: number }): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/users/weight-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, entry }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    // Update cache
    const cached = await loadFromCache<any[]>(`weight_history_${userId}`) || [];
    const filtered = cached.filter(e => e.date !== entry.date);
    filtered.push({ ...entry, id: `${userId}_${entry.date}` });
    await saveToCache(`weight_history_${userId}`, filtered);
  } catch (error) {
    console.error('Save weight entry error:', error);
    throw error;
  }
}

export async function getWeightHistory(userId: string): Promise<{ date: string; weight: number; bodyFat?: number }[]> {
  try {
    const response = await fetch(`${API_BASE}/users/weight-history?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const history = await response.json();
    
    // Cache history
    await saveToCache(`weight_history_${userId}`, history);
    
    return history;
  } catch (error) {
    console.error('Get weight history error:', error);
    // Try cache
    return await loadFromCache<any[]>(`weight_history_${userId}`) || [];
  }
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
  resistance?: number;
  reactance?: number;
  phaseAngle?: number;
  muscleMass?: number;
  skeletalMuscle?: number;
  waterPercent?: number;
  waterKg?: number;
  boneMass?: number;
  proteinPercent?: number;
  proteinMass?: number;
  basalMetabolism?: number;
  visceralFat?: number;
  triceps?: number;
  biceps?: number;
  subscapular?: number;
  suprailiac?: number;
  abdominal?: number;
  chestSkinfold?: number;
  axillaryMid?: number;
  thighSkinfold?: number;
  calfSkinfold?: number;
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
  leanMass?: number;
  fatMass?: number;
  bmi?: number;
  waistHipRatio?: number;
  notes?: string;
}

export async function saveBodyMeasurement(userId: string, measurement: BodyMeasurement): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/users/body-measurements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, measurement }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    // Update cache
    const cached = await loadFromCache<BodyMeasurement[]>(`body_measurements_${userId}`) || [];
    const filtered = cached.filter(m => m.date !== measurement.date);
    filtered.push(measurement);
    await saveToCache(`body_measurements_${userId}`, filtered);
  } catch (error) {
    console.error('Save body measurement error:', error);
    throw error;
  }
}

export async function getBodyMeasurements(userId: string, limit: number = 30): Promise<BodyMeasurement[]> {
  try {
    const response = await fetch(`${API_BASE}/users/body-measurements?userId=${encodeURIComponent(userId)}&limit=${limit}`);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const measurements = await response.json();
    
    // Cache measurements
    await saveToCache(`body_measurements_${userId}`, measurements);
    
    return measurements;
  } catch (error) {
    console.error('Get body measurements error:', error);
    // Try cache
    return await loadFromCache<BodyMeasurement[]>(`body_measurements_${userId}`) || [];
  }
}
