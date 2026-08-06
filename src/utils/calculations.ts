// Nutrition and fitness calculations

import { UserProfile, Macros, ActivityLevel, Goal } from '../types';
import { ACTIVITY_LEVELS } from '../constants/foods';

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

// Target calories based on goal
export function calculateTargetCalories(profile: UserProfile): number {
  const tdee = calculateTDEE(profile);
  switch (profile.goal) {
    case 'bulking':
      return Math.round(tdee * 1.15); // +15% surplus
    case 'cutting':
      return Math.round(tdee * 0.85); // -15% deficit
    case 'maintenance':
    default:
      return tdee;
  }
}

// Macro distribution for athletes
export function calculateMacros(profile: UserProfile): Macros {
  const calories = calculateTargetCalories(profile);
  const { weight, goal } = profile;

  // Protein: 2g per kg for bodybuilding, 1.8g for BJJ
  const proteinMultiplier = profile.sport === 'bodybuilding' ? 2.0 : 1.8;
  const protein = Math.round(weight * proteinMultiplier);

  // Fat: 25% of calories
  const fatCalories = calories * 0.25;
  const fat = Math.round(fatCalories / 9);

  // Remaining calories from carbs
  const proteinCalories = protein * 4;
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbs = Math.round(carbCalories / 4);

  return { calories, protein, carbs, fat };
}

// Calculate macros for a food portion
export function calculatePortionMacros(food: { macros: Macros }, grams: number): Macros {
  const factor = grams / 100;
  return {
    calories: Math.round(food.macros.calories * factor),
    protein: Math.round(food.macros.protein * factor * 10) / 10,
    carbs: Math.round(food.macros.carbs * factor * 10) / 10,
    fat: Math.round(food.macros.fat * factor * 10) / 10,
  };
}

// Sum macros
export function sumMacros(macrosList: Macros[]): Macros {
  return macrosList.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
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
