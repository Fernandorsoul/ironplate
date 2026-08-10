import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile, DailyLog, MealPlan, WeightEntry, Macros, Food, WeeklySummary, Meal, Workout } from '../types';
import { calculateMacros } from '../utils/calculations';
import * as Storage from '../services/storage';
import * as Database from '../services/database';

interface AppContextType {
  // Auth
  userId: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;

  // User
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => Promise<void>;
  targetMacros: Macros | null;

  // Daily logs
  dailyLogs: DailyLog[];
  todayLog: DailyLog | null;
  addMealToToday: (meal: Meal) => Promise<void>;
  removeMealFromToday: (mealId: string) => Promise<void>;
  addWorkoutToToday: (workout: Workout) => Promise<void>;
  removeWorkoutFromToday: (workoutId: string) => Promise<void>;
  updateWorkoutInToday: (workoutId: string, updatedWorkout: Workout) => Promise<void>;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [targetMacros, setTargetMacros] = useState<Macros | null>(null);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [savedProfile, savedLogs, savedPlans, savedWeight, savedCustomFoods, savedUserId] = await Promise.all([
        Storage.loadUserProfile(),
        Storage.loadDailyLogs(),
        Storage.loadMealPlans(),
        Storage.loadWeightHistory(),
        Storage.loadCustomFoods(),
        Storage.loadUserId(),
      ]);
      if (savedProfile) {
        setProfileState(savedProfile);
        setTargetMacros(calculateMacros(savedProfile));
      }
      setDailyLogs(savedLogs);
      setMealPlans(savedPlans);
      setWeightHistory(savedWeight);
      setCustomFoods(savedCustomFoods);
      if (savedUserId) {
        setUserId(savedUserId);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayDate = useCallback(() => new Date().toISOString().split('T')[0], []);

  const getTodayLog = useCallback((): DailyLog => {
    const today = getTodayDate();
    return dailyLogs.find(log => log.date === today) || {
      date: today,
      meals: [],
      workouts: [],
      totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }, [dailyLogs, getTodayDate]);

  const updateTodayLog = useCallback(async (updater: (log: DailyLog) => DailyLog) => {
    const today = getTodayDate();
    const currentLog = getTodayLog();
    const updated = updater(currentLog);
    setDailyLogs(prev => {
      const newLogs = prev.filter(log => log.date !== today);
      newLogs.push(updated);
      Storage.saveDailyLogs(newLogs);
      return newLogs;
    });
  }, [getTodayDate, getTodayLog]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await Database.authenticateUser(email, password);
      if (!user) return false;
      setUserId(user.id);
      await Storage.saveUserId(user.id);

      const existingProfile = await Database.getUserById(user.id);
      if (existingProfile) {
        setProfileState(existingProfile);
        setTargetMacros(calculateMacros(existingProfile));
        await Storage.saveUserProfile(existingProfile);
      }
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const user = await Database.createUser(name, email, password);
      if (!user) return false;
      setUserId(user.id);
      await Storage.saveUserId(user.id);
      return true;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setUserId(null);
    setProfileState(null);
    setTargetMacros(null);
    setDailyLogs([]);
    setMealPlans([]);
    setWeightHistory([]);
    setCustomFoods([]);
    await Storage.removeUserId();
  }, []);

  const setProfile = useCallback(async (newProfile: UserProfile) => {
    setProfileState(newProfile);
    setTargetMacros(calculateMacros(newProfile));
    await Storage.saveUserProfile(newProfile);
  }, []);

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
    const entry: WeightEntry = { date: getTodayDate(), weight };
    setWeightHistory(prev => {
      const newHistory = prev.filter(e => e.date !== entry.date);
      newHistory.push(entry);
      newHistory.sort((a, b) => a.date.localeCompare(b.date));
      Storage.saveWeightHistory(newHistory);
      return newHistory;
    });
  }, [updateTodayLog, getTodayDate]);

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

  const addWeightEntry = useCallback(async (entry: WeightEntry) => {
    setWeightHistory(prev => {
      const newHistory = prev.filter(e => e.date !== entry.date);
      newHistory.push(entry);
      newHistory.sort((a, b) => a.date.localeCompare(b.date));
      Storage.saveWeightHistory(newHistory);
      return newHistory;
    });
  }, []);

  const addCustomFood = useCallback(async (food: Food) => {
    setCustomFoods(prev => {
      const newFoods = [...prev, food];
      Storage.saveCustomFoods(newFoods);
      return newFoods;
    });
  }, []);

  const getWeeklySummary = useCallback((): WeeklySummary => {
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
  }, [dailyLogs, targetMacros]);

  return (
    <AppContext.Provider
      value={{
        userId,
        isAuthenticated: !!userId,
        login,
        register,
        logout,
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
