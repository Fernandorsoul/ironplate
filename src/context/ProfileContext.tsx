import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UserProfile, Macros, WeightEntry, Food } from '../types';
import { calculateMacros } from '../utils/calculations';
import * as Storage from '../services/storage';
import * as Database from '../services/database';

interface ProfileContextType {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => Promise<void>;
  targetMacros: Macros | null;
  weightHistory: WeightEntry[];
  addWeightEntry: (entry: WeightEntry) => Promise<void>;
  customFoods: Food[];
  addCustomFood: (food: Food) => Promise<void>;
  loadProfileData: (userId: string) => Promise<void>;
  clearProfileData: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [targetMacros, setTargetMacros] = useState<Macros | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [customFoods, setCustomFoods] = useState<Food[]>([]);

  const loadProfileData = useCallback(async (userId: string) => {
    const [savedProfile, savedWeight, savedCustomFoods] = await Promise.all([
      Storage.loadUserProfile(),
      Storage.loadWeightHistory(),
      Storage.loadCustomFoods(),
    ]);

    if (savedProfile) {
      setProfileState(savedProfile);
      setTargetMacros(calculateMacros(savedProfile));
    } else {
      // Try loading from database
      const dbProfile = await Database.getUserById(userId);
      if (dbProfile) {
        setProfileState(dbProfile);
        setTargetMacros(calculateMacros(dbProfile));
        await Storage.saveUserProfile(dbProfile);
      }
    }
    setWeightHistory(savedWeight);
    setCustomFoods(savedCustomFoods);
  }, []);

  const clearProfileData = useCallback(() => {
    setProfileState(null);
    setTargetMacros(null);
    setWeightHistory([]);
    setCustomFoods([]);
  }, []);

  const setProfile = useCallback(async (newProfile: UserProfile) => {
    setProfileState(newProfile);
    setTargetMacros(calculateMacros(newProfile));
    await Storage.saveUserProfile(newProfile);
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

  return (
    <ProfileContext.Provider value={{
      profile, setProfile, targetMacros,
      weightHistory, addWeightEntry,
      customFoods, addCustomFood,
      loadProfileData, clearProfileData,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
