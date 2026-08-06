import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, DailyLog, MealPlan, WeightEntry, Macros, Food, WeeklySummary } from '../types';
import { calculateMacros } from '../utils/calculations';
import * as Storage from '../services/storage';

interface AppContextType {
  // User
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => Promise<void>;
  targetMacros: Macros | null;

  // Daily logs
  dailyLogs: DailyLog[];
  todayLog: DailyLog | null;
  addMealToToday: (meal: any) => Promise<void>;
  removeMealFromToday: (mealId: string) => Promise<void>;
  addWorkoutToToday: (workout: any) => Promise<void>;
  removeWorkoutFromToday: (workoutId: string) => Promise<void>;
  updateWorkoutInToday: (workoutId: string, updatedWorkout: any) => Promise<void>;
  setTodayWeight: (weight: number) => Promise<void>;

  // Meal plans
  mealPlans: MealPlan[];
  saveMealPlan: (plan: MealPlan) => Promise<void>;
  deleteMealPlan: (id: string) => Promise<void>;

  // Weight
  weightHistory: WeightEntry[];
  addWeightEntry: (entry: WeightEntry) => Promise<void>;

  // Custom foods
  customFoods: Food[];
  addCustomFood: (food: Food) => Promise<void>;

  // Weekly summary
  getWeeklySummary: () => WeeklySummary;

  // State
  isLoading: boolean;
  isOnboarded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [targetMacros, setTargetMacros] = useState<Macros | null>(null);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [savedProfile, savedLogs, savedPlans, savedWeight, savedCustomFoods] = await Promise.all([
        Storage.loadUserProfile(),
        Storage.loadDailyLogs(),
        Storage.loadMealPlans(),
        Storage.loadWeightHistory(),
        Storage.loadCustomFoods(),
      ]);
      if (savedProfile) {
        setProfileState(savedProfile);
        setTargetMacros(calculateMacros(savedProfile));
      }
      setDailyLogs(savedLogs);
      setMealPlans(savedPlans);
      setWeightHistory(savedWeight);
      setCustomFoods(savedCustomFoods);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setProfile = async (newProfile: UserProfile) => {
    setProfileState(newProfile);
    setTargetMacros(calculateMacros(newProfile));
    await Storage.saveUserProfile(newProfile);
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const getTodayLog = (): DailyLog => {
    const today = getTodayDate();
    const existing = dailyLogs.find(log => log.date === today);
    if (existing) return existing;
    return { date: today, meals: [], workouts: [], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
  };

  const updateTodayLog = async (updater: (log: DailyLog) => DailyLog) => {
    const today = getTodayDate();
    const todayLog = getTodayLog();
    const updated = updater(todayLog);
    const newLogs = dailyLogs.filter(log => log.date !== today);
    newLogs.push(updated);
    setDailyLogs(newLogs);
    await Storage.saveDailyLogs(newLogs);
  };

  const addMealToToday = async (meal: any) => {
    await updateTodayLog(log => ({
      ...log,
      meals: [...log.meals, meal],
      totalMacros: {
        calories: log.totalMacros.calories + meal.totalMacros.calories,
        protein: log.totalMacros.protein + meal.totalMacros.protein,
        carbs: log.totalMacros.carbs + meal.totalMacros.carbs,
        fat: log.totalMacros.fat + meal.totalMacros.fat,
      },
    }));
  };

  const removeMealFromToday = async (mealId: string) => {
    await updateTodayLog(log => {
      const meal = log.meals.find(m => m.id === mealId);
      if (!meal) return log;
      return {
        ...log,
        meals: log.meals.filter(m => m.id !== mealId),
        totalMacros: {
          calories: log.totalMacros.calories - meal.totalMacros.calories,
          protein: log.totalMacros.protein - meal.totalMacros.protein,
          carbs: log.totalMacros.carbs - meal.totalMacros.carbs,
          fat: log.totalMacros.fat - meal.totalMacros.fat,
        },
      };
    });
  };

  const addWorkoutToToday = async (workout: any) => {
    await updateTodayLog(log => ({ ...log, workouts: [...log.workouts, workout] }));
  };

  const removeWorkoutFromToday = async (workoutId: string) => {
    await updateTodayLog(log => ({
      ...log,
      workouts: log.workouts.filter((w: any) => w.id !== workoutId),
    }));
  };

  const updateWorkoutInToday = async (workoutId: string, updatedWorkout: any) => {
    await updateTodayLog(log => ({
      ...log,
      workouts: log.workouts.map((w: any) => w.id === workoutId ? updatedWorkout : w),
    }));
  };

  const setTodayWeight = async (weight: number) => {
    await updateTodayLog(log => ({ ...log, weight }));
    await addWeightEntry({ date: getTodayDate(), weight });
  };

  const saveMealPlan = async (plan: MealPlan) => {
    const newPlans = mealPlans.filter(p => p.id !== plan.id);
    newPlans.push(plan);
    setMealPlans(newPlans);
    await Storage.saveMealPlans(newPlans);
  };

  const deleteMealPlan = async (id: string) => {
    const newPlans = mealPlans.filter(p => p.id !== id);
    setMealPlans(newPlans);
    await Storage.saveMealPlans(newPlans);
  };

  const addWeightEntry = async (entry: WeightEntry) => {
    const newHistory = weightHistory.filter(e => e.date !== entry.date);
    newHistory.push(entry);
    newHistory.sort((a, b) => a.date.localeCompare(b.date));
    setWeightHistory(newHistory);
    await Storage.saveWeightHistory(newHistory);
  };

  // Generated by Ollama (qwen2.5-coder:7b) via Rsoul Factory focused pipeline
  const deleteDailyLog = (date: string, logs: DailyLog[]): DailyLog[] => {
    return logs.filter(log => log.date !== date);
  };

  const addCustomFood = async (food: Food) => {
    const newFoods = [...customFoods, food];
    setCustomFoods(newFoods);
    await Storage.saveCustomFoods(newFoods);
  };

  // Generated by Ollama (qwen2.5-coder:7b) via Rsoul Factory focused pipeline
  const getWeeklySummary = (): WeeklySummary => {
    const last7Days = dailyLogs.slice(-7);
    if (last7Days.length === 0) return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, daysTracked: 0, adherencePercent: 0 };

    let totalCal = 0, totalProt = 0, totalCarb = 0, totalFat = 0;
    let adherenceCount = 0;

    for (const log of last7Days) {
      totalCal += log.totalMacros.calories;
      totalProt += log.totalMacros.protein;
      totalCarb += log.totalMacros.carbs;
      totalFat += log.totalMacros.fat;
      if (targetMacros && log.totalMacros.calories >= targetMacros.calories * 0.9) adherenceCount++;
    }

    const daysTracked = last7Days.length;
    return {
      avgCalories: Math.round(totalCal / daysTracked),
      avgProtein: Math.round(totalProt / daysTracked),
      avgCarbs: Math.round(totalCarb / daysTracked),
      avgFat: Math.round(totalFat / daysTracked),
      daysTracked,
      adherencePercent: Math.round((adherenceCount / daysTracked) * 100),
    };
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        setProfile,
        targetMacros,
        dailyLogs,
        todayLog: getTodayLog(),
        addMealToToday,
        removeMealFromToday,
        addWorkoutToToday,
        removeWorkoutFromToday,
        updateWorkoutInToday,
        setTodayWeight,
        mealPlans,
        saveMealPlan,
        deleteMealPlan,
        weightHistory,
        addWeightEntry,
        customFoods,
        addCustomFood,
        getWeeklySummary,
        isLoading,
        isOnboarded: !!profile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
