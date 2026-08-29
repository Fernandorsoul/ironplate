// IronPlate Types

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'bulking' | 'cutting_conservative' | 'cutting_preparation' | 'cutting_precontest' | 'maintenance';
export type Sport =
  | 'bodybuilding'
  | 'bjj'
  | 'both'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'soccer'
  | 'functional'
  | 'calisthenics'
  | 'walking'
  | 'hybrid'
  | 'other';
export type MealTiming = 'pre_workout' | 'post_workout' | 'regular';
export type WorkoutType =
  | 'strength'
  | 'bjj'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'soccer'
  | 'functional'
  | 'calisthenics'
  | 'walking'
  | 'cardio'
  | 'rest'
  | 'other';
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'full_body';
export type TrainingSplitId =
  | 'full_body'
  | 'upper_lower'
  | 'abc_classic'
  | 'abc_antagonist'
  | 'push_pull_legs'
  | 'abcd'
  | 'abcde'
  | 'custom';

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

export interface FoodPortionDef {
  unit: 'unidade' | 'fatia' | 'colher' | 'xicara' | 'ml' | 'g' | 'dente';
  gramsPerUnit: number;
  label?: string; // e.g., "1 ovo (~50g)"
}

export interface Food {
  id: string;
  name: string;
  macros: Macros; // per 100g
  category: string;
  portions?: FoodPortionDef[];
}

export interface FoodPortion {
  food: Food;
  grams: number;
  quantity?: number;
  unit?: 'unidade' | 'fatia' | 'colher' | 'xicara' | 'ml' | 'g' | 'dente';
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
  isActive?: boolean;
  supplements?: SupplementRecommendation[];
}

export interface SupplementRecommendation {
  name: string;
  dose: string;
  timing: string;
  reason: string;
  caution?: string;
}

export interface Workout {
  id: string;
  name: string;
  type: WorkoutType;
  duration: number; // minutes
  intensity: 'low' | 'medium' | 'high';
  time?: string;
  splitId?: TrainingSplitId;
  splitDayId?: string;
  muscleGroups?: MuscleGroup[];
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
