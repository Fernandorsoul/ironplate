import { TACO_DATABASE } from '../constants/taco';
import { Food, FoodPortion, Macros, MealPlan } from '../types';
import { calculatePortionMacros } from './calculations';
import { getPortionQuantity } from './portionDisplay';

export type FoodCostTier = 1 | 2 | 3;
export type SubstitutionGroup = 'protein' | 'carbs' | 'fat' | 'vegetables';

export interface FoodSubstitution {
  portion: FoodPortion;
  isCheaper: boolean;
  costTier: FoodCostTier;
  originalCostTier: FoodCostTier;
  matchedMacro: keyof Pick<Macros, 'protein' | 'carbs' | 'fat'> | 'portion';
  macroDifferencePercent: number;
  calorieDifference: number;
}

export interface MealSubstitutionGroup {
  mealId: string;
  mealName: string;
  items: Array<{
    original: FoodPortion;
    alternatives: FoodSubstitution[];
  }>;
}

const SUBSTITUTION_GROUPS: Record<SubstitutionGroup, string[]> = {
  protein: [
    'taco_045', 'taco_047', 'taco_051', 'taco_053', 'taco_054', 'taco_059',
    'taco_063', 'taco_064', 'taco_069', 'taco_071', 'taco_076',
  ],
  carbs: [
    'taco_001', 'taco_002', 'taco_003', 'taco_004', 'taco_009', 'taco_014',
    'taco_028', 'taco_029', 'taco_030',
  ],
  fat: ['taco_038', 'taco_041', 'taco_083', 'taco_087'],
  vegetables: ['taco_016', 'taco_017', 'taco_019', 'taco_020', 'taco_021', 'taco_022', 'taco_026'],
};

// Faixas relativas para priorização; não representam preço em tempo real.
const FOOD_COST_TIERS: Record<string, FoodCostTier> = {
  taco_001: 1,
  taco_002: 2,
  taco_003: 1,
  taco_004: 1,
  taco_009: 1,
  taco_014: 3,
  taco_016: 2,
  taco_017: 2,
  taco_019: 1,
  taco_020: 1,
  taco_021: 1,
  taco_022: 1,
  taco_026: 1,
  taco_028: 1,
  taco_029: 1,
  taco_030: 2,
  taco_038: 2,
  taco_041: 2,
  taco_045: 3,
  taco_047: 2,
  taco_051: 1,
  taco_053: 2,
  taco_054: 3,
  taco_059: 2,
  taco_063: 1,
  taco_064: 2,
  taco_069: 1,
  taco_071: 2,
  taco_076: 3,
  taco_083: 3,
  taco_087: 1,
};

const MATCHED_MACRO: Record<SubstitutionGroup, FoodSubstitution['matchedMacro']> = {
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
  vegetables: 'portion',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToFive(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}

function findGroup(foodId: string): SubstitutionGroup | undefined {
  return (Object.keys(SUBSTITUTION_GROUPS) as SubstitutionGroup[])
    .find(group => SUBSTITUTION_GROUPS[group].includes(foodId));
}

function findFood(foodId: string): Food | undefined {
  return TACO_DATABASE.find(food => food.id === foodId);
}

export function getFoodCostTier(foodId: string): FoodCostTier {
  return FOOD_COST_TIERS[foodId] || 2;
}

export function getCostTierLabel(tier: FoodCostTier): string {
  if (tier === 1) return 'mais econômico';
  if (tier === 2) return 'custo intermediário';
  return 'custo mais alto';
}

export function getMatchedMacroLabel(macro: FoodSubstitution['matchedMacro']): string {
  if (macro === 'protein') return 'proteína semelhante';
  if (macro === 'carbs') return 'carboidrato semelhante';
  if (macro === 'fat') return 'gordura semelhante';
  return 'porção equivalente';
}

export function getFoodSubstitutions(
  original: FoodPortion,
  options: { onlyCheaper?: boolean; limit?: number } = {},
): FoodSubstitution[] {
  const group = findGroup(original.food.id);
  if (!group) return [];

  const matchedMacro = MATCHED_MACRO[group];
  const originalCostTier = getFoodCostTier(original.food.id);
  const originalMacros = calculatePortionMacros(original.food, original.grams);

  const alternatives = SUBSTITUTION_GROUPS[group]
    .filter(foodId => foodId !== original.food.id)
    .map(foodId => findFood(foodId))
    .filter((food): food is Food => Boolean(food))
    .map(food => {
      let grams = original.grams;
      if (matchedMacro !== 'portion') {
        const macroPer100g = food.macros[matchedMacro];
        if (macroPer100g <= 0) return null;
        grams = (originalMacros[matchedMacro] / macroPer100g) * 100;
      }

      grams = roundToFive(clamp(grams, 5, 500));
      const macros = calculatePortionMacros(food, grams);
      const costTier = getFoodCostTier(food.id);
      const macroDifferencePercent = matchedMacro === 'portion'
        ? 0
        : Math.abs(macros[matchedMacro] - originalMacros[matchedMacro])
          / Math.max(originalMacros[matchedMacro], 1) * 100;

      return {
        portion: {
          food,
          grams,
          ...getPortionQuantity(food, grams),
          macros,
        },
        isCheaper: costTier < originalCostTier,
        costTier,
        originalCostTier,
        matchedMacro,
        macroDifferencePercent,
        calorieDifference: Math.round(macros.calories - originalMacros.calories),
      } satisfies FoodSubstitution;
    })
    .filter((item): item is FoodSubstitution => Boolean(item))
    .filter(item => item.macroDifferencePercent <= 10)
    .filter(item => !options.onlyCheaper || item.isCheaper)
    .sort((a, b) => {
      if (a.isCheaper !== b.isCheaper) return a.isCheaper ? -1 : 1;
      if (a.costTier !== b.costTier) return a.costTier - b.costTier;
      return Math.abs(a.calorieDifference) - Math.abs(b.calorieDifference);
    });

  return alternatives.slice(0, options.limit ?? 3);
}

export function getPlanSubstitutions(
  plan: MealPlan,
  options: { onlyCheaper?: boolean; limitPerFood?: number } = {},
): MealSubstitutionGroup[] {
  return plan.meals
    .map(meal => ({
      mealId: meal.id,
      mealName: meal.name,
      items: meal.foods
        .map(original => ({
          original,
          alternatives: getFoodSubstitutions(original, {
            onlyCheaper: options.onlyCheaper,
            limit: options.limitPerFood ?? 2,
          }),
        }))
        .filter(item => item.alternatives.length > 0),
    }))
    .filter(meal => meal.items.length > 0);
}
