// AsyncStorage service for offline persistence

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyLog, MealPlan, WeightEntry, Food } from '../types';

const KEYS = {
  USER_PROFILE: '@ironplate_user_profile',
  DAILY_LOGS: '@ironplate_daily_logs',
  MEAL_PLANS: '@ironplate_meal_plans',
  WEIGHT_HISTORY: '@ironplate_weight_history',
  CUSTOM_FOODS: '@ironplate_custom_foods',
  USER_ID: '@ironplate_user_id',
} as const;

export async function saveData<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
}

export async function loadData<T>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
}

export async function removeData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing data:', error);
    throw error;
  }
}

// User Profile
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await saveData(KEYS.USER_PROFILE, profile);
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  return await loadData<UserProfile>(KEYS.USER_PROFILE);
}

// Daily Logs
export async function saveDailyLogs(logs: DailyLog[]): Promise<void> {
  await saveData(KEYS.DAILY_LOGS, logs);
}

export async function loadDailyLogs(): Promise<DailyLog[]> {
  return (await loadData<DailyLog[]>(KEYS.DAILY_LOGS)) || [];
}

// Meal Plans
export async function saveMealPlans(plans: MealPlan[]): Promise<void> {
  await saveData(KEYS.MEAL_PLANS, plans);
}

export async function loadMealPlans(): Promise<MealPlan[]> {
  return (await loadData<MealPlan[]>(KEYS.MEAL_PLANS)) || [];
}

// Weight History
export async function saveWeightHistory(entries: WeightEntry[]): Promise<void> {
  await saveData(KEYS.WEIGHT_HISTORY, entries);
}

export async function loadWeightHistory(): Promise<WeightEntry[]> {
  return (await loadData<WeightEntry[]>(KEYS.WEIGHT_HISTORY)) || [];
}

// Custom Foods
export async function saveCustomFoods(foods: Food[]): Promise<void> {
  await saveData(KEYS.CUSTOM_FOODS, foods);
}

export async function loadCustomFoods(): Promise<Food[]> {
  return (await loadData<Food[]>(KEYS.CUSTOM_FOODS)) || [];
}

// User ID
export async function saveUserId(userId: string): Promise<void> {
  await saveData(KEYS.USER_ID, userId);
}

export async function loadUserId(): Promise<string | null> {
  return await loadData<string>(KEYS.USER_ID);
}

export async function removeUserId(): Promise<void> {
  await removeData(KEYS.USER_ID);
}

export async function removeUserProfile(): Promise<void> {
  await removeData(KEYS.USER_PROFILE);
}

export async function removeDailyLogs(): Promise<void> {
  await removeData(KEYS.DAILY_LOGS);
}

export async function removeMealPlans(): Promise<void> {
  await removeData(KEYS.MEAL_PLANS);
}

export async function removeWeightHistory(): Promise<void> {
  await removeData(KEYS.WEIGHT_HISTORY);
}

export async function removeCustomFoods(): Promise<void> {
  await removeData(KEYS.CUSTOM_FOODS);
}

export { KEYS };
