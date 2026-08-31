// Nutrition and fitness calculations

import { UserProfile, Macros, Workout } from '../types';
import { ACTIVITY_LEVELS } from '../constants/foods';
import { isStrengthFocusedSport } from '../constants/sports';

export function roundNutritionValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function formatNutritionValue(value: number): string {
  return roundNutritionValue(value)
    .toFixed(3)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}

// Mifflin-St Jeor equation for BMR
export function calculateBMR(profile: UserProfile): number {
  const { weight, height, age, gender } = profile;
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

// Total Daily Energy Expenditure
export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const multiplier = ACTIVITY_LEVELS[profile.activityLevel].multiplier;
  return Math.round(bmr * multiplier);
}

const WORKOUT_MET: Record<Workout['type'], number> = {
  strength: 6,
  cardio: 8,
  bjj: 10.3,
  running: 9.8,
  cycling: 7.5,
  swimming: 8,
  soccer: 7,
  functional: 7.5,
  calisthenics: 6,
  walking: 3.8,
  rest: 1.3,
  other: 5,
};

const INTENSITY_FACTOR: Record<Workout['intensity'], number> = {
  low: 0.8,
  medium: 1,
  high: 1.2,
};

export function calculateWorkoutCalories(workout: Workout, weightKg: number): number {
  if (weightKg <= 0 || workout.duration <= 0) return 0;
  const met = WORKOUT_MET[workout.type] * INTENSITY_FACTOR[workout.intensity];
  return Math.round((met * 3.5 * weightKg / 200) * workout.duration);
}

export function calculateDailyEnergyExpenditure(profile: UserProfile, workouts: Workout[]) {
  const baseExpenditure = Math.round(calculateBMR(profile) * 1.2);
  const workoutExpenditure = workouts.reduce(
    (total, workout) => total + calculateWorkoutCalories(workout, profile.weight),
    0,
  );
  return {
    baseExpenditure,
    workoutExpenditure,
    totalExpenditure: baseExpenditure + workoutExpenditure,
  };
}

// Target calories based on goal
// Evidence-based: Ruiz-Castellano et al. (2021) - PMC8471721
// Helms et al. (2014) - ISSN recommendations for bodybuilders
export function calculateTargetCalories(profile: UserProfile): number {
  const tdee = calculateTDEE(profile);
  switch (profile.goal) {
    case 'bulking':
      return Math.round(tdee * 1.15); // +15% surplus → ~0.3-0.5% BW gain/week
    case 'cutting_conservative':
      return Math.round(tdee * 0.85); // -15% deficit → ~0.3-0.5% BW loss/week (iniciantes/off-season)
    case 'cutting_preparation':
      return Math.round(tdee * 0.80); // -20% deficit → ~0.5-0.7% BW loss/week (12-8 semanas)
    case 'cutting_precontest':
      return Math.round(tdee * 0.75); // -25% deficit → ~0.7-1.0% BW loss/week (8-4 semanas)
    case 'maintenance':
    default:
      return tdee;
  }
}

// Macro distribution for athletes
// Based on ISSN Position Stand on protein, ISSN/ACSM recommendations
export function calculateMacros(profile: UserProfile): Macros {
  const calories = calculateTargetCalories(profile);
  const { weight, goal, sport } = profile;

  // Proteína por peso corporal quando a massa livre de gordura não está
  // disponível. Valores maiores citados para pré-contest (2,3–3,1 g/kg)
  // referem-se à massa livre de gordura e não devem ser aplicados diretamente
  // ao peso total.
  let proteinMultiplier: number;
  
  switch (goal) {
    case 'cutting_conservative':
      proteinMultiplier = isStrengthFocusedSport(sport) ? 2.0 : 1.8;
      break;
    case 'cutting_preparation':
      proteinMultiplier = isStrengthFocusedSport(sport) ? 2.2 : 2.0;
      break;
    case 'cutting_precontest':
      proteinMultiplier = isStrengthFocusedSport(sport) ? 2.2 : 2.0;
      break;
    case 'bulking':
      proteinMultiplier = isStrengthFocusedSport(sport) ? 1.8 : 1.6;
      break;
    case 'maintenance':
    default:
      proteinMultiplier = isStrengthFocusedSport(sport) ? 1.8 : 1.6;
      break;
  }
  
  // Fat: varies by goal
  // Cutting: lower fat to prioritize carbs for training performance
  // Bulking: moderate fat for hormonal support
  let fatPct: number;
  switch (goal) {
    case 'cutting_conservative':
      fatPct = 0.25;
      break;
    case 'cutting_preparation':
      fatPct = 0.22;
      break;
    case 'cutting_precontest':
      fatPct = 0.20;
      break;
    case 'bulking':
      fatPct = 0.28;
      break;
    case 'maintenance':
    default:
      fatPct = 0.25;
      break;
  }
  
  const fatCalories = calories * fatPct;
  const fat = Math.round((fatCalories / 9) * 1000) / 1000;

  // Reserva energia para carboidratos, essenciais para sustentar o treinamento.
  // O piso prático de 1,5 g/kg é limitado quando necessário para preservar ao
  // menos 1,6 g/kg de proteína; perfis clínicos ainda exigem avaliação individual.
  const requestedProtein = weight * proteinMultiplier;
  const percentageCarbFloor = calories * 0.20;
  const performanceCarbFloor = weight * 1.5 * 4;
  const energyAfterMinimumProtein = calories - fatCalories - weight * 1.6 * 4;
  const minimumCarbCalories = Math.min(
    Math.max(percentageCarbFloor, performanceCarbFloor),
    Math.max(percentageCarbFloor, energyAfterMinimumProtein),
  );
  const maxProteinByEnergy = Math.max(0, (calories - fatCalories - minimumCarbCalories) / 4);
  const protein = Math.round(Math.min(requestedProtein, maxProteinByEnergy));

  // Remaining calories from carbs
  const proteinCalories = protein * 4;
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbs = Math.round((carbCalories / 4) * 1000) / 1000;

  return { calories, protein, carbs, fat };
}

// Calculate macros for a food portion
export function calculatePortionMacros(food: { macros: Macros }, grams: number): Macros {
  const factor = grams / 100;
  return {
    calories: roundNutritionValue(food.macros.calories * factor),
    protein: roundNutritionValue(food.macros.protein * factor),
    carbs: roundNutritionValue(food.macros.carbs * factor),
    fat: roundNutritionValue(food.macros.fat * factor),
  };
}

// Sum macros
export function sumMacros(macrosList: Macros[]): Macros {
  const sum = macrosList.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  // Round to 3 decimal places to avoid floating point issues
  return {
    calories: roundNutritionValue(sum.calories),
    protein: roundNutritionValue(sum.protein),
    carbs: roundNutritionValue(sum.carbs),
    fat: roundNutritionValue(sum.fat),
  };
}

// Macro percentages
export function getMacroPercentages(macros: Macros): { protein: number; carbs: number; fat: number } {
  const totalCalories = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  if (totalCalories === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((macros.protein * 4 / totalCalories) * 100),
    carbs: Math.round((macros.carbs * 4 / totalCalories) * 100),
    fat: Math.round((macros.fat * 9 / totalCalories) * 100),
  };
}
