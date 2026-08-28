import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  deleteAccount: () => Promise<boolean>;

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
  setActiveMealPlan: (id: string) => Promise<void>;

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
  const dailyLogsRef = useRef<DailyLog[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // First, load userId from AsyncStorage (this is the only thing we keep there)
      const savedUserId = await Storage.loadUserId();
      
      if (!savedUserId) {
        console.log('No user logged in');
        setIsLoading(false);
        return;
      }

      console.log('Loading data for user:', savedUserId);

      // Load all data from SQLite (mobile) or API (web)
      const [profile, logs, plans, weight, customFoods] = await Promise.all([
        Database.getUserById(savedUserId),
        Database.getDailyLogs(savedUserId, 100),
        Database.getMealPlans(savedUserId),
        Database.getWeightHistory(savedUserId),
        Database.getCustomFoods(savedUserId),
      ]);

      console.log('Data loaded:', {
        profile: !!profile,
        logs: logs?.length || 0,
        plans: plans?.length || 0,
        weight: weight?.length || 0,
        customFoods: customFoods?.length || 0,
      });

      setUserId(savedUserId);
      
      if (profile) {
        setProfileState(profile);
        setTargetMacros(calculateMacros(profile));
        // Also save to AsyncStorage for backward compatibility
        await Storage.saveUserProfile(profile);
      }
      
      dailyLogsRef.current = logs || [];
      setDailyLogs(logs || []);
      setMealPlans(plans || []);
      setWeightHistory(weight || []);
      setCustomFoods(customFoods || []);
      
      // Also save to AsyncStorage for backward compatibility
      await Storage.saveDailyLogs(logs || []);
      await Storage.saveMealPlans(plans || []);
      await Storage.saveWeightHistory(weight || []);
      await Storage.saveCustomFoods(customFoods || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayDate = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }, []);

  const getTodayLog = useCallback((): DailyLog => {
    const today = getTodayDate();
    return dailyLogsRef.current.find(log => log.date === today) || {
      date: today,
      meals: [],
      workouts: [],
      totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }, [getTodayDate]);

  const updateTodayLog = useCallback(async (updater: (log: DailyLog) => DailyLog) => {
    const today = getTodayDate();
    const currentLog = getTodayLog();
    const updated = updater(currentLog);
    const newLogs = dailyLogsRef.current.filter(log => log.date !== today);
    newLogs.push(updated);
    dailyLogsRef.current = newLogs;
    setDailyLogs(newLogs);
    await Storage.saveDailyLogs(newLogs);
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

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    try {
      if (!userId) return false;

      // Chamar API para deletar conta no servidor
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Limpar todos os dados locais
      await Storage.removeUserId();
      await Storage.removeUserProfile();
      await Storage.removeDailyLogs();
      await Storage.removeMealPlans();
      await Storage.removeWeightHistory();
      await Storage.removeCustomFoods();

      // Resetar estado
      setUserId(null);
      setProfileState(null);
      setTargetMacros(null);
      setDailyLogs([]);
      setMealPlans([]);
      setWeightHistory([]);
      setCustomFoods([]);

      return true;
    } catch (error) {
      console.error('Delete account error:', error);
      return false;
    }
  }, [userId]);

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

  const setActiveMealPlan = useCallback(async (id: string) => {
    setMealPlans(prev => {
      const newPlans = prev.map(plan => ({ ...plan, isActive: plan.id === id }));
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
        deleteAccount,
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
        setActiveMealPlan,
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
