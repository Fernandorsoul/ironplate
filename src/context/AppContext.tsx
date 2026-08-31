import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import { UserProfile, DailyLog, MealPlan, WeightEntry, Macros, Food, WeeklySummary, Meal, Workout } from '../types';
import { calculateMacros, sumMacros } from '../utils/calculations';
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
  const dailyLogUpdateQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateUserData = useCallback(async (savedUserId: string) => {
    const [savedProfile, logs, plans, weight, savedCustomFoods] = await Promise.all([
      Database.getUserById(savedUserId),
      Database.getDailyLogs(savedUserId, 100),
      Database.getMealPlans(savedUserId),
      Database.getWeightHistory(savedUserId),
      Database.getCustomFoods(savedUserId),
    ]);

    setProfileState(savedProfile);
    setTargetMacros(savedProfile ? calculateMacros(savedProfile) : null);
    const sortedLogs = [...(logs || [])].sort((a, b) => a.date.localeCompare(b.date));
    dailyLogsRef.current = sortedLogs;
    setDailyLogs(sortedLogs);
    setMealPlans(plans || []);
    setWeightHistory(weight || []);
    setCustomFoods(savedCustomFoods || []);
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      await purgeLegacyLocalData();
      const session = await loadSession();
      
      if (!session) return;
      const savedUserId = session.userId;

      await hydrateUserData(savedUserId);
      setUserId(savedUserId);
    } catch (error) {
      console.error('Error loading data:', error);
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [hydrateUserData]);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

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

  const updateTodayLog = useCallback((updater: (log: DailyLog) => DailyLog): Promise<void> => {
    if (!userId) return Promise.reject(new Error('Authentication required'));

    const executeUpdate = async () => {
      const today = getTodayDate();
      const currentLog = getTodayLog();
      const candidate = updater(currentLog);
      const updated: DailyLog = {
        ...candidate,
        totalMacros: sumMacros(candidate.meals.map(meal => meal.totalMacros)),
      };

      await Database.saveDailyLog(userId, updated);

      const newLogs = dailyLogsRef.current.filter(log => log.date !== today);
      newLogs.push(updated);
      newLogs.sort((a, b) => a.date.localeCompare(b.date));
      dailyLogsRef.current = newLogs;
      setDailyLogs(newLogs);
    };

    const queuedUpdate = dailyLogUpdateQueueRef.current
      .catch(() => undefined)
      .then(executeUpdate);
    dailyLogUpdateQueueRef.current = queuedUpdate.then(
      () => undefined,
      () => undefined,
    );
    return queuedUpdate;
  }, [getTodayDate, getTodayLog, userId]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await Database.authenticateUser(email, password);
      if (!user) return false;
      await saveSession({ userId: user.id, accessToken: user.accessToken });
      notifyTemporaryWebSession();
      await hydrateUserData(user.id);
      setUserId(user.id);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, [hydrateUserData]);

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
    const { name, age, weight, height, gender, activityLevel, goal, sport, photoUri } = newProfile;
    await Database.updateUser(userId, {
      name, age, weight, height, gender, activityLevel, goal, sport, photoUri,
    });
    setProfileState(newProfile);
    setTargetMacros(calculateMacros(newProfile));
  }, [userId]);

  const addMealToToday = useCallback(async (meal: Meal) => {
    await updateTodayLog(log => ({
      ...log,
      meals: [...log.meals, meal],
    }));
  }, [updateTodayLog]);

  const removeMealFromToday = useCallback(async (mealId: string) => {
    await updateTodayLog(log => {
      const meal = log.meals.find(m => m.id === mealId);
      if (!meal) return log;
      return {
        ...log,
        meals: log.meals.filter(m => m.id !== mealId),
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

  const persistWeightEntry = useCallback(async (entry: WeightEntry) => {
    if (!userId) throw new Error('Authentication required');
    await Database.saveWeightEntry(userId, entry);

    const existingLog = dailyLogsRef.current.find(log => log.date === entry.date);
    const updatedLog: DailyLog = existingLog
      ? { ...existingLog, weight: entry.weight }
      : {
          date: entry.date,
          meals: [],
          workouts: [],
          weight: entry.weight,
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        };
    const newLogs = dailyLogsRef.current.filter(log => log.date !== entry.date);
    newLogs.push(updatedLog);
    newLogs.sort((a, b) => a.date.localeCompare(b.date));
    dailyLogsRef.current = newLogs;
    setDailyLogs(newLogs);

    setWeightHistory(prev => [
      ...prev.filter(e => e.date !== entry.date),
      entry,
    ].sort((a, b) => a.date.localeCompare(b.date)));
  }, [userId]);

  const setTodayWeight = useCallback(async (weight: number) => {
    await persistWeightEntry({ date: getTodayDate(), weight });
  }, [getTodayDate, persistWeightEntry]);

  const saveMealPlan = useCallback(async (plan: MealPlan) => {
    if (!userId) throw new Error('Authentication required');
    await Database.saveMealPlan(userId, plan);
    setMealPlans(prev => [
      ...prev
        .filter(p => p.id !== plan.id)
        .map(p => plan.isActive ? { ...p, isActive: false } : p),
      plan,
    ]);
  }, [userId]);

  const deleteMealPlan = useCallback(async (id: string) => {
    if (!userId) throw new Error('Authentication required');
    await Database.deleteMealPlan(userId, id);
    setMealPlans(prev => prev.filter(p => p.id !== id));
  }, [userId]);

  const setActiveMealPlan = useCallback(async (id: string) => {
    if (!userId) throw new Error('Authentication required');
    await Database.activateMealPlan(userId, id);
    setMealPlans(prev => prev.map(plan => ({ ...plan, isActive: plan.id === id })));
  }, [userId]);

  const addWeightEntry = useCallback(async (entry: WeightEntry) => {
    await persistWeightEntry(entry);
  }, [persistWeightEntry]);

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
