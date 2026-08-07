// IronPlate Types

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'bulking' | 'cutting_conservative' | 'cutting_preparation' | 'cutting_precontest' | 'maintenance';
export type Sport = 'bodybuilding' | 'bjj' | 'both';
export type MealTiming = 'pre_workout' | 'post_workout' | 'regular';

export interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  birthDate?: string; // YYYY-MM-DD
  photoUri?: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: 'male' | 'female';
  activityLevel: ActivityLevel;
  goal: Goal;
  sport: Sport;
}

export interface Macros {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams;
}

export interface Food {
  id: string;
  name: string;
  macros: Macros; // per 100g
  category: string;
}

export interface FoodPortion {
  food: Food;
  grams: number;
  macros: Macros; // calculated for portion
}

export interface Meal {
  id: string;
  name: string;
  timing: MealTiming;
  foods: FoodPortion[];
  totalMacros: Macros;
  time?: string;
}

export interface MealPlan {
  id: string;
  name: string;
  goal: Goal;
  meals: Meal[];
  totalMacros: Macros;
  createdAt: string;
}

export interface Workout {
  id: string;
  name: string;
  type: 'strength' | 'cardio' | 'bjj' | 'rest';
  duration: number; // minutes
  intensity: 'low' | 'medium' | 'high';
  time?: string;
}

export interface DailyLog {
  date: string;
  meals: Meal[];
  workouts: Workout[];
  weight?: number;
  totalMacros: Macros;
  notes?: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
  bodyFat?: number;
}

export interface WeeklySummary {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  daysTracked: number;
  adherencePercent: number;
}
