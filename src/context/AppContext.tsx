import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import { UserProfile, DailyLog, MealPlan, WeightEntry, Macros, Food, WeeklySummary, Meal, Workout } from '../types';
import { calculateMacros } from '../utils/calculations';
import * as Database from '../services/database';
import { purgeLegacyLocalData } from '../services/storage';
import { clearSession, loadSession, saveSession } from '../services/session';

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
let webSessionNoticeShown = false;

function notifyTemporaryWebSession() {
  if (Platform.OS !== 'web' || webSessionNoticeShown) return;
  webSessionNoticeShown = true;
  Alert.alert(
    'Sessão temporária no navegador',
    'Por segurança, sua sessão não será salva neste navegador. Ao recarregar a página, faça login novamente.',
  );
}

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
      await purgeLegacyLocalData();
      const session = await loadSession();
      
      if (!session) return;
      const savedUserId = session.userId;

      // Load all data from SQLite (mobile) or API (web)
      const [profile, logs, plans, weight, customFoods] = await Promise.all([
        Database.getUserById(savedUserId),
        Database.getDailyLogs(savedUserId, 100),
        Database.getMealPlans(savedUserId),
        Database.getWeightHistory(savedUserId),
        Database.getCustomFoods(savedUserId),
      ]);

      setUserId(savedUserId);
      
      if (profile) {
        setProfileState(profile);
        setTargetMacros(calculateMacros(profile));
      }
      
      dailyLogsRef.current = logs || [];
      setDailyLogs(logs || []);
      setMealPlans(plans || []);
      setWeightHistory(weight || []);
      setCustomFoods(customFoods || []);
    } catch (error) {
      console.error('Error loading data:', error);
      await clearSession();
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
    if (!userId) throw new Error('Authentication required');
    const today = getTodayDate();
    const currentLog = getTodayLog();
    const updated = updater(currentLog);
    await Database.saveDailyLog(userId, updated);
    const newLogs = dailyLogsRef.current.filter(log => log.date !== today);
    newLogs.push(updated);
    dailyLogsRef.current = newLogs;
    setDailyLogs(newLogs);
  }, [getTodayDate, getTodayLog, userId]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await Database.authenticateUser(email, password);
      if (!user) return false;
      await saveSession({ userId: user.id, accessToken: user.accessToken });
      notifyTemporaryWebSession();
      setUserId(user.id);

      const existingProfile = await Database.getUserById(user.id);
      if (existingProfile) {
        setProfileState(existingProfile);
        setTargetMacros(calculateMacros(existingProfile));
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
      await saveSession({ userId: user.id, accessToken: user.accessToken });
      notifyTemporaryWebSession();
      setUserId(user.id);
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
    dailyLogsRef.current = [];
    await clearSession();
  }, []);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    try {
      if (!userId) return false;

      await Database.deleteAccount(userId);
      await clearSession();
      await purgeLegacyLocalData();

      // Resetar estado
      setUserId(null);
      setProfileState(null);
      setTargetMacros(null);
      setDailyLogs([]);
      setMealPlans([]);
      setWeightHistory([]);
      setCustomFoods([]);
      dailyLogsRef.current = [];

      return true;
    } catch (error) {
      console.error('Delete account error:', error);
      return false;
    }
  }, [userId]);

  const setProfile = useCallback(async (newProfile: UserProfile) => {
    if (!userId) throw new Error('Authentication required');
    const { name, age, weight, height, gender, activityLevel, goal, sport } = newProfile;
    await Database.updateUser(userId, {
      name, age, weight, height, gender, activityLevel, goal, sport,
    });
    setProfileState(newProfile);
    setTargetMacros(calculateMacros(newProfile));
  }, [userId]);

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
    setWeightHistory(prev => [
      ...prev.filter(e => e.date !== entry.date),
      entry,
    ].sort((a, b) => a.date.localeCompare(b.date)));
  }, [updateTodayLog, getTodayDate]);

  const saveMealPlan = useCallback(async (plan: MealPlan) => {
    if (!userId) throw new Error('Authentication required');
    await Database.saveMealPlan(userId, plan);
    setMealPlans(prev => [...prev.filter(p => p.id !== plan.id), plan]);
  }, [userId]);

  const deleteMealPlan = useCallback(async (id: string) => {
    if (!userId) throw new Error('Authentication required');
    await Database.deleteMealPlan(userId, id);
    setMealPlans(prev => prev.filter(p => p.id !== id));
  }, [userId]);

  const setActiveMealPlan = useCallback(async (id: string) => {
    if (!userId) throw new Error('Authentication required');
    const updatedPlans = mealPlans.map(plan => ({ ...plan, isActive: plan.id === id }));
    await Promise.all(updatedPlans.map(plan => Database.saveMealPlan(userId, plan)));
    setMealPlans(updatedPlans);
  }, [mealPlans, userId]);

  const addWeightEntry = useCallback(async (entry: WeightEntry) => {
    if (!userId) throw new Error('Authentication required');
    await Database.saveWeightEntry(userId, entry);
    setWeightHistory(prev => [
      ...prev.filter(e => e.date !== entry.date),
      entry,
    ].sort((a, b) => a.date.localeCompare(b.date)));
  }, [userId]);

  const addCustomFood = useCallback(async (food: Food) => {
    if (!userId) throw new Error('Authentication required');
    await Database.saveCustomFood(userId, food);
    setCustomFoods(prev => [...prev.filter(item => item.id !== food.id), food]);
  }, [userId]);

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
