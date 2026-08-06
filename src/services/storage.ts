// AsyncStorage service for offline persistence

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_PROFILE: '@ironplate_user_profile',
  DAILY_LOGS: '@ironplate_daily_logs',
  MEAL_PLANS: '@ironplate_meal_plans',
  WEIGHT_HISTORY: '@ironplate_weight_history',
  CUSTOM_FOODS: '@ironplate_custom_foods',
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
export async function saveUserProfile(profile: any): Promise<void> {
  await saveData(KEYS.USER_PROFILE, profile);
}

export async function loadUserProfile(): Promise<any> {
  return await loadData(KEYS.USER_PROFILE);
}

// Daily Logs
export async function saveDailyLogs(logs: any[]): Promise<void> {
  await saveData(KEYS.DAILY_LOGS, logs);
}

export async function loadDailyLogs(): Promise<any[]> {
  return (await loadData(KEYS.DAILY_LOGS)) || [];
}

// Meal Plans
export async function saveMealPlans(plans: any[]): Promise<void> {
  await saveData(KEYS.MEAL_PLANS, plans);
}

export async function loadMealPlans(): Promise<any[]> {
  return (await loadData(KEYS.MEAL_PLANS)) || [];
}

// Weight History
export async function saveWeightHistory(entries: any[]): Promise<void> {
  await saveData(KEYS.WEIGHT_HISTORY, entries);
}

export async function loadWeightHistory(): Promise<any[]> {
  return (await loadData(KEYS.WEIGHT_HISTORY)) || [];
}

// Custom Foods
export async function saveCustomFoods(foods: any[]): Promise<void> {
  await saveData(KEYS.CUSTOM_FOODS, foods);
}

export async function loadCustomFoods(): Promise<any[]> {
  return (await loadData(KEYS.CUSTOM_FOODS)) || [];
}

export { KEYS };
