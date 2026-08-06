// Diet Generator — Gera planos alimentares baseados no perfil do atleta
// Usa a tabela TACO para alimentos com macros precisos

import { Food, Meal, MealPlan, MealTiming, Macros, UserProfile, Goal } from '../types';
import { TACO_DATABASE } from '../constants/taco';
import { calculateMacros, calculatePortionMacros, sumMacros } from './calculations';

// ============================================================
// TIPOS
// ============================================================

interface DietTemplate {
  name: string;
  goal: Goal;
  meals: MealTemplate[];
}

interface MealTemplate {
  name: string;
  timing: MealTiming;
  proteinSources: string[]; // IDs de alimentos TACO
  carbSources: string[];
  fatSources: string[];
  veggieSources: string[];
  targetMacroRatio: { protein: number; carbs: number; fat: number }; // % do total
}

// ============================================================
// TEMPLATES DE REFEIÇÕES POR OBJETIVO
// ============================================================

const BULKING_TEMPLATES: MealTemplate[] = [
  {
    name: 'Café da Manhã',
    timing: 'regular',
    proteinSources: ['taco_063', 'taco_076'], // Ovo, Whey
    carbSources: ['taco_003', 'taco_028'], // Aveia, Banana
    fatSources: ['taco_083'], // Amêndoas
    veggieSources: [],
    targetMacroRatio: { protein: 0.20, carbs: 0.30, fat: 0.15 },
  },
  {
    name: 'Lanche da Manhã',
    timing: 'regular',
    proteinSources: ['taco_076'], // Whey
    carbSources: ['taco_028', 'taco_090'], // Banana, Pasta amendoim
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.10, carbs: 0.10, fat: 0.10 },
  },
  {
    name: 'Almoço',
    timing: 'regular',
    proteinSources: ['taco_051', 'taco_053'], // Frango, Patinho
    carbSources: ['taco_001', 'taco_009'], // Arroz, Batata doce
    fatSources: ['taco_041'], // Azeite
    veggieSources: ['taco_016', 'taco_020'], // Brócolis, Cenoura
    targetMacroRatio: { protein: 0.25, carbs: 0.25, fat: 0.25 },
  },
  {
    name: 'Pré-treino',
    timing: 'pre_workout',
    proteinSources: ['taco_076'], // Whey
    carbSources: ['taco_009', 'taco_028'], // Batata doce, Banana
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.10, carbs: 0.15, fat: 0.05 },
  },
  {
    name: 'Pós-treino',
    timing: 'post_workout',
    proteinSources: ['taco_076', 'taco_064'], // Whey, Clara ovo
    carbSources: ['taco_028'], // Banana
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.15, carbs: 0.10, fat: 0.05 },
  },
  {
    name: 'Jantar',
    timing: 'regular',
    proteinSources: ['taco_045', 'taco_054'], // Salmão, Alcatra
    carbSources: ['taco_002', 'taco_004'], // Arroz integral, Macarrão
    fatSources: ['taco_041'], // Azeite
    veggieSources: ['taco_019', 'taco_022'], // Abobrinha, Tomate
    targetMacroRatio: { protein: 0.20, carbs: 0.10, fat: 0.40 },
  },
];

const CUTTING_TEMPLATES: MealTemplate[] = [
  {
    name: 'Café da Manhã',
    timing: 'regular',
    proteinSources: ['taco_064', 'taco_063'], // Clara, Ovo inteiro
    carbSources: ['taco_003'], // Aveia
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.25, carbs: 0.20, fat: 0.15 },
  },
  {
    name: 'Lanche da Manhã',
    timing: 'regular',
    proteinSources: ['taco_070'], // Iogurte grego
    carbSources: [],
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.10, carbs: 0.05, fat: 0.10 },
  },
  {
    name: 'Almoço',
    timing: 'regular',
    proteinSources: ['taco_051', 'taco_059'], // Frango, Peru
    carbSources: ['taco_002', 'taco_014'], // Arroz integral, Quinoa
    fatSources: ['taco_041'], // Azeite (pouco)
    veggieSources: ['taco_016', 'taco_017', 'taco_021'], // Brócolis, Couve, Alface
    targetMacroRatio: { protein: 0.30, carbs: 0.25, fat: 0.25 },
  },
  {
    name: 'Pré-treino',
    timing: 'pre_workout',
    proteinSources: ['taco_076'], // Whey
    carbSources: ['taco_028'], // Banana
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.10, carbs: 0.15, fat: 0.05 },
  },
  {
    name: 'Pós-treino',
    timing: 'post_workout',
    proteinSources: ['taco_076'], // Whey
    carbSources: [],
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.10, carbs: 0.05, fat: 0.05 },
  },
  {
    name: 'Jantar',
    timing: 'regular',
    proteinSources: ['taco_045', 'taco_047'], // Salmão, Tilápia
    carbSources: [],
    fatSources: [],
    veggieSources: ['taco_019', 'taco_022', 'taco_026'], // Abobrinha, Tomate, Repolho
    targetMacroRatio: { protein: 0.15, carbs: 0.05, fat: 0.40 },
  },
];

const MAINTENANCE_TEMPLATES: MealTemplate[] = [
  {
    name: 'Café da Manhã',
    timing: 'regular',
    proteinSources: ['taco_063', 'taco_076'],
    carbSources: ['taco_003', 'taco_028'],
    fatSources: ['taco_083'],
    veggieSources: [],
    targetMacroRatio: { protein: 0.20, carbs: 0.25, fat: 0.15 },
  },
  {
    name: 'Lanche da Manhã',
    timing: 'regular',
    proteinSources: ['taco_070'],
    carbSources: ['taco_030'],
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.10, carbs: 0.10, fat: 0.10 },
  },
  {
    name: 'Almoço',
    timing: 'regular',
    proteinSources: ['taco_051'],
    carbSources: ['taco_001', 'taco_009'],
    fatSources: ['taco_041'],
    veggieSources: ['taco_016', 'taco_020'],
    targetMacroRatio: { protein: 0.25, carbs: 0.25, fat: 0.25 },
  },
  {
    name: 'Pré-treino',
    timing: 'pre_workout',
    proteinSources: ['taco_076'],
    carbSources: ['taco_009'],
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.10, carbs: 0.15, fat: 0.05 },
  },
  {
    name: 'Pós-treino',
    timing: 'post_workout',
    proteinSources: ['taco_076'],
    carbSources: ['taco_028'],
    fatSources: [],
    veggieSources: [],
    targetMacroRatio: { protein: 0.10, carbs: 0.10, fat: 0.05 },
  },
  {
    name: 'Jantar',
    timing: 'regular',
    proteinSources: ['taco_045'],
    carbSources: ['taco_002'],
    fatSources: ['taco_041'],
    veggieSources: ['taco_019', 'taco_022'],
    targetMacroRatio: { protein: 0.25, carbs: 0.15, fat: 0.40 },
  },
];

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function getFoodById(id: string): Food | undefined {
  return TACO_DATABASE.find(f => f.id === id);
}

function calculateGramsForMacro(
  food: Food,
  targetMacro: keyof Macros,
  targetAmount: number
): number {
  const macroPer100g = food.macros[targetMacro];
  if (macroPer100g === 0) return 0;
  return Math.round((targetAmount / macroPer100g) * 100);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// GERADOR DE DIETA
// ============================================================

export function generateDiet(profile: UserProfile): MealPlan {
  const targetMacros = calculateMacros(profile);

  // Seleciona template baseado no objetivo
  let templates: MealTemplate[];
  switch (profile.goal) {
    case 'bulking':
      templates = BULKING_TEMPLATES;
      break;
    case 'cutting':
      templates = CUTTING_TEMPLATES;
      break;
    case 'maintenance':
    default:
      templates = MAINTENANCE_TEMPLATES;
      break;
  }

  // Gera refeições
  const meals: Meal[] = templates.map((template, index) => {
    const meal: Meal = generateMeal(template, targetMacros, index);
    return meal;
  });

  // Calcula totais
  const totalMacros = sumMacros(meals.map(m => m.totalMacros));

  // Ajusta porções para bater as metas
  const adjustedMeals = adjustMealsToTarget(meals, targetMacros);

  const goalLabel = profile.goal === 'bulking' ? 'Bulking' :
                    profile.goal === 'cutting' ? 'Cutting' : 'Manutenção';

  return {
    id: `diet_${Date.now()}`,
    name: `Plano ${goalLabel} - ${profile.sport === 'bodybuilding' ? 'Bodybuilding' : profile.sport === 'bjj' ? 'BJJ' : 'Atleta'}`,
    goal: profile.goal,
    meals: adjustedMeals,
    totalMacros: sumMacros(adjustedMeals.map(m => m.totalMacros)),
    createdAt: new Date().toISOString(),
  };
}

function generateMeal(
  template: MealTemplate,
  targetMacros: Macros,
  index: number
): Meal {
  const foods: { food: Food; grams: number }[] = [];

  // Calcula macros alvo para esta refeição
  const mealTargetCalories = Math.round(targetMacros.calories * template.targetMacroRatio.protein +
                                        targetMacros.calories * template.targetMacroRatio.carbs +
                                        targetMacros.calories * template.targetMacroRatio.fat);
  const mealTargetProtein = Math.round(targetMacros.protein * template.targetMacroRatio.protein);
  const mealTargetCarbs = Math.round(targetMacros.carbs * template.targetMacroRatio.carbs);
  const mealTargetFat = Math.round(targetMacros.fat * template.targetMacroRatio.fat);

  // Seleciona e calcula porções de proteína
  for (const sourceId of template.proteinSources) {
    const food = getFoodById(sourceId);
    if (!food) continue;

    const targetFromSource = Math.round(mealTargetProtein / template.proteinSources.length);
    let grams = calculateGramsForMacro(food, 'protein', targetFromSource);

    // Limita porções realistas
    grams = Math.max(30, Math.min(300, grams));

    foods.push({ food, grams });
  }

  // Seleciona e calcula porções de carboidratos
  for (const sourceId of template.carbSources) {
    const food = getFoodById(sourceId);
    if (!food) continue;

    const targetFromSource = Math.round(mealTargetCarbs / template.carbSources.length);
    let grams = calculateGramsForMacro(food, 'carbs', targetFromSource);

    grams = Math.max(30, Math.min(400, grams));

    foods.push({ food, grams });
  }

  // Seleciona e calcula porções de gorduras
  for (const sourceId of template.fatSources) {
    const food = getFoodById(sourceId);
    if (!food) continue;

    const targetFromSource = Math.round(mealTargetFat / template.fatSources.length);
    let grams = calculateGramsForMacro(food, 'fat', targetFromSource);

    // Gorduras têm porções menores
    grams = Math.max(5, Math.min(30, grams));

    foods.push({ food, grams });
  }

  // Adiciona vegetais (fixo, baixa caloria)
  for (const sourceId of template.veggieSources) {
    const food = getFoodById(sourceId);
    if (!food) continue;
    foods.push({ food, grams: 100 }); // 100g fixo
  }

  // Calcula macros totais da refeição
  const portionMacros = foods.map(f => calculatePortionMacros(f.food, f.grams));
  const totalMacros = sumMacros(portionMacros);

  return {
    id: `meal_${index}_${Date.now()}`,
    name: template.name,
    timing: template.timing,
    foods: foods.map((f, i) => ({
      food: f.food,
      grams: f.grams,
      macros: portionMacros[i],
    })),
    totalMacros,
  };
}

function adjustMealsToTarget(meals: Meal[], target: Macros): Meal[] {
  // Por enquanto retorna as refeições como geradas
  // Futuro: ajustar proporcionalmente para bater exatamente as metas
  return meals;
}

// ============================================================
// SUGESTÕES DE ALIMENTOS POR CATEGORIA
// ============================================================

export function getProteinSources(): Food[] {
  return TACO_DATABASE.filter(f =>
    f.macros.protein > 15 &&
    ['Carnes e derivados', 'Pescados e frutos do mar', 'Ovos e derivados', 'Leite e derivados'].includes(f.category)
  );
}

export function getCarbSources(): Food[] {
  return TACO_DATABASE.filter(f =>
    f.macros.carbs > 15 &&
    ['Cereais e derivados', 'Frutas e derivados', 'Leguminosas e derivados'].includes(f.category)
  );
}

export function getFatSources(): Food[] {
  return TACO_DATABASE.filter(f =>
    f.macros.fat > 20 &&
    ['Gorduras e óleos', 'Nozes e sementes'].includes(f.category)
  );
}

export function getVeggieSources(): Food[] {
  return TACO_DATABASE.filter(f =>
    f.macros.calories < 40 &&
    f.category === 'Verduras, hortaliças e derivados'
  );
}
