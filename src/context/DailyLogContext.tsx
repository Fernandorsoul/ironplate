import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { DailyLog, Meal, Workout, Macros, MealPlan, WeeklySummary } from '../types';
import * as Storage from '../services/storage';

interface DailyLogContextType {
  dailyLogs: DailyLog[];
  todayLog: DailyLog;
  addMealToToday: (meal: Meal) => Promise<void>;
  removeMealFromToday: (mealId: string) => Promise<void>;
  addWorkoutToToday: (workout: Workout) => Promise<void>;
  removeWorkoutFromToday: (workoutId: string) => Promise<void>;
  updateWorkoutInToday: (workoutId: string, updatedWorkout: Workout) => Promise<void>;
  setTodayWeight: (weight: number) => Promise<void>;
  mealPlans: MealPlan[];
  saveMealPlan: (plan: MealPlan) => Promise<void>;
  deleteMealPlan: (id: string) => Promise<void>;
  getWeeklySummary: (targetMacros: Macros | null) => WeeklySummary;
  loadLogsData: () => Promise<void>;
  clearLogsData: () => void;
}

const EMPTY_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

const DEFAULT_TODAY_LOG: DailyLog = {
  date: new Date().toISOString().split('T')[0],
  meals: [],
  workouts: [],
  totalMacros: EMPTY_MACROS,
};

const DailyLogContext = createContext<DailyLogContextType | undefined>(undefined);

export function DailyLogProvider({ children }: { children: ReactNode }) {
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);

  const getTodayDate = useCallback(() => new Date().toISOString().split('T')[0], []);

  const todayLog = useMemo((): DailyLog => {
    const today = getTodayDate();
    return dailyLogs.find(log => log.date === today) || { ...DEFAULT_TODAY_LOG, date: today };
  }, [dailyLogs, getTodayDate]);

  const loadLogsData = useCallback(async () => {
    const [savedLogs, savedPlans] = await Promise.all([
      Storage.loadDailyLogs(),
      Storage.loadMealPlans(),
    ]);
    setDailyLogs(savedLogs);
    setMealPlans(savedPlans);
  }, []);

  const clearLogsData = useCallback(() => {
    setDailyLogs([]);
    setMealPlans([]);
  }, []);

  const updateTodayLog = useCallback(async (updater: (log: DailyLog) => DailyLog) => {
    const today = getTodayDate();
    setDailyLogs(prev => {
      const currentLog = prev.find(log => log.date === today) || { ...DEFAULT_TODAY_LOG, date: today };
      const updated = updater(currentLog);
      const newLogs = prev.filter(log => log.date !== today);
      newLogs.push(updated);
      Storage.saveDailyLogs(newLogs);
      return newLogs;
    });
  }, [getTodayDate]);

  const addMealToToday = useCallback(async (meal: Meal) => {
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
  }, [updateTodayLog]);

  const removeMealFromToday = useCallback(async (mealId: string) => {
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
  }, [updateTodayLog]);

  const addWorkoutToToday = useCallback(async (workout: Workout) => {
    await updateTodayLog(log => ({ ...log, workouts: [...log.workouts, workout] }));
  }, [updateTodayLog]);

  const removeWorkoutFromToday = useCallback(async (workoutId: string) => {
    await updateTodayLog(log => ({
      ...log,
      workouts: log.workouts.filter(w => w.id !== workoutId),
    }));
  }, [updateTodayLog]);

  const updateWorkoutInToday = useCallback(async (workoutId: string, updatedWorkout: Workout) => {
    await updateTodayLog(log => ({
      ...log,
      workouts: log.workouts.map(w => w.id === workoutId ? updatedWorkout : w),
    }));
  }, [updateTodayLog]);

  const setTodayWeight = useCallback(async (weight: number) => {
    await updateTodayLog(log => ({ ...log, weight }));
  }, [updateTodayLog]);

  const saveMealPlan = useCallback(async (plan: MealPlan) => {
    setMealPlans(prev => {
      const newPlans = prev.filter(p => p.id !== plan.id);
      newPlans.push(plan);
      Storage.saveMealPlans(newPlans);
      return newPlans;
    });
  }, []);

  const deleteMealPlan = useCallback(async (id: string) => {
    setMealPlans(prev => {
      const newPlans = prev.filter(p => p.id !== id);
      Storage.saveMealPlans(newPlans);
      return newPlans;
    });
  }, []);

  const getWeeklySummary = useCallback((targetMacros: Macros | null): WeeklySummary => {
    const last7Days = dailyLogs.slice(-7);
    if (last7Days.length === 0) {
      return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, daysTracked: 0, adherencePercent: 0 };
    }

    let totalCal = 0, totalProt = 0, totalCarb = 0, totalFat = 0;
    let adherenceCount = 0;

    for (const log of last7Days) {
      totalCal += log.totalMacros.calories;
      totalProt += log.totalMacros.protein;
      totalCarb += log.totalMacros.carbs;
      totalFat += log.totalMacros.fat;
      if (targetMacros && log.totalMacros.calories >= targetMacros.calories * 0.9) {
        adherenceCount++;
      }
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
  }, [dailyLogs]);

  return (
    <DailyLogContext.Provider value={{
      dailyLogs, todayLog,
      addMealToToday, removeMealFromToday,
      addWorkoutToToday, removeWorkoutFromToday, updateWorkoutInToday,
      setTodayWeight,
      mealPlans, saveMealPlan, deleteMealPlan,
      getWeeklySummary,
      loadLogsData, clearLogsData,
    }}>
      {children}
    </DailyLogContext.Provider>
  );
}

export function useDailyLog(): DailyLogContextType {
  const context = useContext(DailyLogContext);
  if (!context) throw new Error('useDailyLog must be used within DailyLogProvider');
  return context;
}
