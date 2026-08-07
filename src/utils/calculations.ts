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

  // Protein by goal and sport (g/kg) - Based on ISSN evidence
  // Helms et al. (2014): 2.3-3.1 g/kg FFM during cutting
  // Morton et al. (2018): 1.6 g/kg minimum for muscle growth
  let proteinMultiplier: number;
  
  switch (goal) {
    case 'cutting_conservative':
      proteinMultiplier = sport === 'bodybuilding' ? 2.2 : 2.0;
      break;
    case 'cutting_preparation':
      proteinMultiplier = sport === 'bodybuilding' ? 2.4 : 2.2;
      break;
    case 'cutting_precontest':
      proteinMultiplier = sport === 'bodybuilding' ? 2.8 : 2.5;
      break;
    case 'bulking':
      proteinMultiplier = sport === 'bodybuilding' ? 2.0 : 1.8;
      break;
    case 'maintenance':
    default:
      proteinMultiplier = sport === 'bodybuilding' ? 1.8 : 1.6;
      break;
  }
  
  const protein = Math.round(weight * proteinMultiplier);

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
    calories: Math.round(food.macros.calories * factor * 1000) / 1000,
    protein: Math.round(food.macros.protein * factor * 1000) / 1000,
    carbs: Math.round(food.macros.carbs * factor * 1000) / 1000,
    fat: Math.round(food.macros.fat * factor * 1000) / 1000,
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
    calories: Math.round(sum.calories * 1000) / 1000,
    protein: Math.round(sum.protein * 1000) / 1000,
    carbs: Math.round(sum.carbs * 1000) / 1000,
    fat: Math.round(sum.fat * 1000) / 1000,
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
