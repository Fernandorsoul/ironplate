// Meal Variety System — Generates different meal options to avoid repetition
// Uses TACO database for food rotation

import { Food, Meal, MealTiming, Macros, UserProfile } from '../types';
import { TACO_DATABASE } from '../constants/taco';
import { calculatePortionMacros, sumMacros } from './calculations';

// ============================================================
// FOOD ROTATION POOLS
// ============================================================

const PROTEIN_POOL = [
  'taco_051', // Peito de frango grelhado
  'taco_053', // Patinho grelhado
  'taco_045', // Salmão
  'taco_047', // Tilápia
  'taco_054', // Alcatra grelhada
  'taco_059', // Peito de peru
  'taco_052', // Coxa de frango
  'taco_055', // Filé mignon
  'taco_046', // Atum fresco
  'taco_057', // Carne moída refogada
];

const CARB_POOL = [
  'taco_001', // Arroz branco
  'taco_002', // Arroz integral
  'taco_009', // Batata-doce cozida
  'taco_014', // Quinoa
  'taco_004', // Macarrão
  'taco_003', // Aveia
  'taco_005', // Macarrão integral
  'taco_011', // Mandioca
  'taco_013', // Milho
];

const VEGGIE_POOL = [
  'taco_016', // Brócolis
  'taco_017', // Couve-flor
  'taco_019', // Abobrinha
  'taco_020', // Cenoura
  'taco_021', // Alface
  'taco_022', // Tomate
  'taco_026', // Repolho
  'taco_027', // Vagem
  'taco_018', // Espinafre
  'taco_024', // Pimentão
];

const FAT_POOL = [
  'taco_041', // Azeite de oliva
  'taco_083', // Amêndoas
  'taco_087', // Amendoim torrado
  'taco_038', // Abacate
  'taco_090', // Pasta de amendoim
  'taco_084', // Castanha-do-pará
];

const FRUIT_POOL = [
  'taco_028', // Banana prata
  'taco_030', // Maçã
  'taco_031', // Laranja
  'taco_032', // Mamão
  'taco_037', // Morango
  'taco_034', // Abacaxi
  'taco_035', // Manga
];

// ============================================================
// HELPERS
// ============================================================

function getFoodById(id: string): Food | undefined {
  return TACO_DATABASE.find(f => f.id === id);
}

function rotateArray<T>(arr: T[], startIndex: number): T[] {
  return [...arr.slice(startIndex), ...arr.slice(0, startIndex)];
}

function calculatePortionForTarget(
  food: Food,
  targetMacro: keyof Macros,
  targetAmount: number
): number {
  const macroPer100g = food.macros[targetMacro];
  if (macroPer100g === 0) return 0;
  return Math.round((targetAmount / macroPer100g) * 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// MEAL TEMPLATES
// ============================================================

interface MealTemplate {
  name: string;
  timing: MealTiming;
  proteinCount: number;
  carbCount: number;
  veggieCount: number;
  fatCount: number;
  fruitCount: number;
  macroSplit: { protein: number; carbs: number; fat: number };
}

const MEAL_TEMPLATES: Record<string, MealTemplate> = {
  'Café da Manhã': {
    name: 'Café da Manhã',
    timing: 'regular',
    proteinCount: 1,
    carbCount: 1,
    veggieCount: 0,
    fatCount: 1,
    fruitCount: 1,
    macroSplit: { protein: 0.20, carbs: 0.25, fat: 0.15 },
  },
  'Lanche da Manhã': {
    name: 'Lanche da Manhã',
    timing: 'regular',
    proteinCount: 1,
    carbCount: 0,
    veggieCount: 0,
    fatCount: 0,
    fruitCount: 1,
    macroSplit: { protein: 0.10, carbs: 0.10, fat: 0.05 },
  },
  'Almoço': {
    name: 'Almoço',
    timing: 'regular',
    proteinCount: 1,
    carbCount: 1,
    veggieCount: 2,
    fatCount: 1,
    fruitCount: 0,
    macroSplit: { protein: 0.25, carbs: 0.25, fat: 0.25 },
  },
  'Pré-treino': {
    name: 'Pré-treino',
    timing: 'pre_workout',
    proteinCount: 1,
    carbCount: 1,
    veggieCount: 0,
    fatCount: 0,
    fruitCount: 1,
    macroSplit: { protein: 0.10, carbs: 0.15, fat: 0.05 },
  },
  'Pós-treino': {
    name: 'Pós-treino',
    timing: 'post_workout',
    proteinCount: 1,
    carbCount: 1,
    veggieCount: 0,
    fatCount: 0,
    fruitCount: 0,
    macroSplit: { protein: 0.15, carbs: 0.10, fat: 0.05 },
  },
  'Jantar': {
    name: 'Jantar',
    timing: 'regular',
    proteinCount: 1,
    carbCount: 1,
    veggieCount: 2,
    fatCount: 1,
    fruitCount: 0,
    macroSplit: { protein: 0.20, carbs: 0.15, fat: 0.45 },
  },
};

// ============================================================
// GENERATE MEAL VARIETY
// ============================================================

export function getMealVariety(
  profile: UserProfile,
  mealName: string,
  count: number = 3
): Meal[] {
  const template = MEAL_TEMPLATES[mealName];
  if (!template) return [];

  const meals: Meal[] = [];
  const targetProtein = Math.round(profile.weight * 2 * template.macroSplit.protein);
  const targetCarbs = Math.round(profile.weight * 4 * template.macroSplit.carbs);

  for (let i = 0; i < count; i++) {
    const foods: { food: Food; grams: number }[] = [];

    // Rotate protein sources
    const proteins = rotateArray(PROTEIN_POOL, i * 2);
    for (let p = 0; p < template.proteinCount; p++) {
      const food = getFoodById(proteins[p % proteins.length]);
      if (!food) continue;
      const grams = clamp(
        calculatePortionForTarget(food, 'protein', targetProtein / template.proteinCount),
        80, 300
      );
      foods.push({ food, grams });
    }

    // Rotate carb sources
    const carbs = rotateArray(CARB_POOL, i * 2);
    for (let c = 0; c < template.carbCount; c++) {
      const food = getFoodById(carbs[c % carbs.length]);
      if (!food) continue;
      const grams = clamp(
        calculatePortionForTarget(food, 'carbs', targetCarbs / template.carbCount),
        50, 300
      );
      foods.push({ food, grams });
    }

    // Rotate veggies
    const veggies = rotateArray(VEGGIE_POOL, i * 3);
    for (let v = 0; v < template.veggieCount; v++) {
      const food = getFoodById(veggies[v % veggies.length]);
      if (!food) continue;
      foods.push({ food, grams: 100 }); // Fixed portion for veggies
    }

    // Rotate fats
    const fats = rotateArray(FAT_POOL, i);
    for (let f = 0; f < template.fatCount; f++) {
      const food = getFoodById(fats[f % fats.length]);
      if (!food) continue;
      const grams = clamp(
        calculatePortionForTarget(food, 'fat', 15),
        5, 30
      );
      foods.push({ food, grams });
    }

    // Rotate fruits
    const fruits = rotateArray(FRUIT_POOL, i * 2);
    for (let fr = 0; fr < template.fruitCount; fr++) {
      const food = getFoodById(fruits[fr % fruits.length]);
      if (!food) continue;
      foods.push({ food, grams: 150 }); // Fixed portion for fruits
    }

    // Calculate macros
    const portionMacros = foods.map(f => calculatePortionMacros(f.food, f.grams));
    const totalMacros = sumMacros(portionMacros);

    meals.push({
      id: `meal_variety_${mealName}_${i}_${Date.now()}`,
      name: `${mealName} (Opção ${i + 1})`,
      timing: template.timing,
      foods: foods.map((f, idx) => ({
        food: f.food,
        grams: f.grams,
        macros: portionMacros[idx],
      })),
      totalMacros,
    });
  }

  return meals;
}

// ============================================================
// GET ALL MEAL OPTIONS FOR A DAY
// ============================================================

export function getDayMealOptions(
  profile: UserProfile,
  optionsPerMeal: number = 3
): Record<string, Meal[]> {
  const mealNames = ['Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Pré-treino', 'Pós-treino', 'Jantar'];
  const result: Record<string, Meal[]> = {};

  for (const mealName of mealNames) {
    result[mealName] = getMealVariety(profile, mealName, optionsPerMeal);
  }

  return result;
}

// ============================================================
// SWAP MEAL OPTION
// ============================================================

export function swapMealOption(
  profile: UserProfile,
  mealName: string,
  currentIndex: number,
  totalOptions: number = 3
): Meal | null {
  const nextIndex = (currentIndex + 1) % totalOptions;
  const options = getMealVariety(profile, mealName, totalOptions);
  return options[nextIndex] || null;
}
