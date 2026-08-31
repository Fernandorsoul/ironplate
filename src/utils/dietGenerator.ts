// Diet Generator v4 — Refeições completas com porções otimizadas por macro
// Fontes: ISSN, ACSM, TACO e Sports Dietitians Australia

import { Food, Meal, MealPlan, MealTiming, Macros, UserProfile, Goal } from '../types';
import { TACO_DATABASE } from '../constants/taco';
import { calculateMacros, calculatePortionMacros, sumMacros } from './calculations';
import { getPortionQuantity } from './portionDisplay';
import * as Crypto from 'expo-crypto';
import { getSportOption, isCombatSport, isStrengthFocusedSport } from '../constants/sports';

// ============================================================
// REFEIÇÕES COMPLETAS PARA ATLETAS
// ============================================================

interface MealConfig {
  name: string;
  timing: MealTiming;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

interface RecipeIngredient {
  foodId: string;
  preferredGrams: number;
  minGrams: number;
  maxGrams: number;
  step?: number;
  fixed?: boolean;
}

interface AthleteMealRecipe {
  name: string;
  ingredients: RecipeIngredient[];
  budget?: boolean;
}

type DietStrategy = 'variety' | 'budget';

const ingredient = (
  foodId: string,
  preferredGrams: number,
  minGrams: number,
  maxGrams: number,
  options: Pick<RecipeIngredient, 'step' | 'fixed'> = {},
): RecipeIngredient => ({ foodId, preferredGrams, minGrams, maxGrams, ...options });

// As combinações são intencionais: cada opção representa um prato ou lanche que
// faz sentido culinariamente. As quantidades são ajustadas depois para a meta do
// atleta. Referências de distribuição: ISSN (20–40 g de proteína a cada 3–4 h)
// e Sports Dietitians Australia (refeições com carboidrato + proteína + vegetais).
const ATHLETE_MEAL_RECIPES: Record<string, AthleteMealRecipe[]> = {
  'Café da Manhã': [
    {
      name: 'Sanduíche integral com cottage e ovos + café preto sem açúcar',
      ingredients: [
        ingredient('taco_096', 200, 200, 200, { fixed: true }),
        ingredient('taco_006', 50, 25, 200, { step: 25 }),
        ingredient('taco_071', 60, 30, 250, { step: 15 }),
        ingredient('taco_063', 100, 50, 200, { step: 50 }),
        ingredient('taco_064', 0, 0, 300, { step: 33 }),
        ingredient('taco_032', 100, 50, 300, { step: 25 }),
      ],
    },
    {
      name: 'Bowl de iogurte grego com aveia, banana e amendoim',
      ingredients: [
        ingredient('taco_070', 170, 100, 400, { step: 10 }),
        ingredient('taco_076', 0, 0, 50, { step: 5 }),
        ingredient('taco_003', 40, 10, 120, { step: 5 }),
        ingredient('taco_028', 100, 50, 250, { step: 10 }),
        ingredient('taco_087', 10, 0, 40, { step: 5 }),
      ],
    },
    {
      name: 'Ovos com pão integral, banana e café preto sem açúcar',
      budget: true,
      ingredients: [
        ingredient('taco_096', 200, 200, 200, { fixed: true }),
        ingredient('taco_006', 50, 25, 150, { step: 25 }),
        ingredient('taco_063', 100, 50, 250, { step: 50 }),
        ingredient('taco_064', 100, 0, 300, { step: 33 }),
        ingredient('taco_028', 100, 50, 250, { step: 10 }),
      ],
    },
  ],
  'Lanche da Manhã': [
    {
      name: 'Iogurte grego com banana e aveia',
      ingredients: [
        ingredient('taco_070', 170, 100, 300, { step: 10 }),
        ingredient('taco_076', 0, 0, 40, { step: 5 }),
        ingredient('taco_028', 100, 50, 200, { step: 10 }),
        ingredient('taco_003', 20, 0, 60, { step: 5 }),
      ],
    },
    {
      name: 'Pão integral com cottage e maçã',
      ingredients: [
        ingredient('taco_006', 50, 25, 100, { step: 25 }),
        ingredient('taco_071', 90, 30, 200, { step: 15 }),
        ingredient('taco_030', 120, 50, 200, { step: 10 }),
      ],
    },
    {
      name: 'Sanduíche integral de ovos com banana',
      budget: true,
      ingredients: [
        ingredient('taco_006', 50, 25, 100, { step: 25 }),
        ingredient('taco_063', 50, 50, 150, { step: 50 }),
        ingredient('taco_064', 66, 0, 200, { step: 33 }),
        ingredient('taco_028', 100, 50, 180, { step: 10 }),
      ],
    },
  ],
  'Almoço': [
    {
      name: 'Frango grelhado com arroz, feijão e brócolis',
      ingredients: [
        ingredient('taco_051', 150, 60, 350, { step: 10 }),
        ingredient('taco_001', 150, 40, 400, { step: 10 }),
        ingredient('taco_077', 100, 40, 250, { step: 10 }),
        ingredient('taco_016', 100, 50, 200, { step: 10 }),
        ingredient('taco_041', 5, 0, 20, { step: 1 }),
      ],
    },
    {
      name: 'Patinho com arroz integral, feijão preto e salada',
      ingredients: [
        ingredient('taco_053', 150, 60, 300, { step: 10 }),
        ingredient('taco_002', 150, 40, 400, { step: 10 }),
        ingredient('taco_078', 100, 40, 250, { step: 10 }),
        ingredient('taco_021', 60, 30, 150, { step: 10 }),
        ingredient('taco_022', 80, 40, 180, { step: 10 }),
        ingredient('taco_041', 5, 0, 20, { step: 1 }),
      ],
    },
    {
      name: 'Frango grelhado com arroz, feijão e abobrinha',
      budget: true,
      ingredients: [
        ingredient('taco_051', 150, 60, 350, { step: 10 }),
        ingredient('taco_001', 150, 40, 400, { step: 10 }),
        ingredient('taco_077', 100, 40, 250, { step: 10 }),
        ingredient('taco_019', 100, 50, 200, { step: 10 }),
        ingredient('taco_041', 5, 0, 25, { step: 1 }),
      ],
    },
  ],
  'Pré-treino': [
    {
      name: 'Iogurte grego com banana, aveia e mel',
      ingredients: [
        ingredient('taco_070', 170, 80, 300, { step: 10 }),
        ingredient('taco_076', 0, 0, 50, { step: 5 }),
        ingredient('taco_028', 120, 50, 250, { step: 10 }),
        ingredient('taco_003', 30, 0, 80, { step: 5 }),
        ingredient('taco_092', 10, 0, 25, { step: 5 }),
      ],
    },
    {
      name: 'Sanduíche integral de cottage e peru desfiado',
      ingredients: [
        ingredient('taco_006', 50, 25, 125, { step: 25 }),
        ingredient('taco_071', 60, 30, 180, { step: 15 }),
        ingredient('taco_059', 80, 40, 200, { step: 10 }),
        ingredient('taco_022', 50, 20, 100, { step: 10 }),
        ingredient('taco_028', 100, 0, 250, { step: 10 }),
      ],
    },
    {
      name: 'Batata-doce com frango grelhado (2–3 h antes)',
      budget: true,
      ingredients: [
        ingredient('taco_009', 180, 60, 600, { step: 10 }),
        ingredient('taco_051', 100, 40, 300, { step: 10 }),
        ingredient('taco_022', 60, 30, 120, { step: 10 }),
      ],
    },
  ],
  'Pós-treino': [
    {
      name: 'Bowl de iogurte, whey, banana e aveia',
      ingredients: [
        ingredient('taco_070', 170, 80, 300, { step: 10 }),
        ingredient('taco_076', 30, 15, 50, { step: 5 }),
        ingredient('taco_028', 120, 50, 250, { step: 10 }),
        ingredient('taco_003', 20, 0, 80, { step: 5 }),
      ],
    },
    {
      name: 'Arroz com frango e brócolis para recuperação',
      ingredients: [
        ingredient('taco_001', 150, 40, 350, { step: 10 }),
        ingredient('taco_051', 120, 50, 280, { step: 10 }),
        ingredient('taco_016', 80, 40, 150, { step: 10 }),
      ],
    },
    {
      name: 'Arroz com frango e cenoura para recuperação',
      budget: true,
      ingredients: [
        ingredient('taco_001', 150, 40, 350, { step: 10 }),
        ingredient('taco_051', 120, 50, 280, { step: 10 }),
        ingredient('taco_020', 80, 40, 150, { step: 10 }),
      ],
    },
  ],
  'Jantar': [
    {
      name: 'Tilápia com arroz, feijão e brócolis',
      ingredients: [
        ingredient('taco_047', 160, 60, 350, { step: 10 }),
        ingredient('taco_001', 120, 40, 350, { step: 10 }),
        ingredient('taco_077', 80, 40, 220, { step: 10 }),
        ingredient('taco_016', 100, 50, 200, { step: 10 }),
        ingredient('taco_041', 5, 0, 20, { step: 1 }),
      ],
    },
    {
      name: 'Frango grelhado com batata-doce e legumes',
      ingredients: [
        ingredient('taco_051', 150, 60, 320, { step: 10 }),
        ingredient('taco_009', 180, 60, 600, { step: 10 }),
        ingredient('taco_017', 100, 50, 200, { step: 10 }),
        ingredient('taco_019', 100, 50, 200, { step: 10 }),
        ingredient('taco_041', 5, 0, 20, { step: 1 }),
      ],
    },
    {
      name: 'Frango com arroz, feijão e legumes',
      budget: true,
      ingredients: [
        ingredient('taco_051', 150, 60, 350, { step: 10 }),
        ingredient('taco_001', 120, 40, 350, { step: 10 }),
        ingredient('taco_077', 80, 40, 220, { step: 10 }),
        ingredient('taco_019', 100, 50, 200, { step: 10 }),
        ingredient('taco_041', 5, 0, 25, { step: 1 }),
      ],
    },
  ],
  'Ceia': [
    {
      name: 'Cottage com mamão e amêndoas',
      ingredients: [
        ingredient('taco_071', 150, 60, 300, { step: 15 }),
        ingredient('taco_032', 120, 50, 250, { step: 10 }),
        ingredient('taco_083', 10, 0, 30, { step: 5 }),
      ],
    },
    {
      name: 'Iogurte grego com morango e aveia',
      ingredients: [
        ingredient('taco_070', 170, 80, 350, { step: 10 }),
        ingredient('taco_076', 0, 0, 50, { step: 5 }),
        ingredient('taco_037', 120, 50, 250, { step: 10 }),
        ingredient('taco_003', 20, 0, 60, { step: 5 }),
      ],
    },
    {
      name: 'Cottage com banana e amendoim',
      budget: true,
      ingredients: [
        ingredient('taco_071', 120, 60, 300, { step: 15 }),
        ingredient('taco_028', 100, 50, 220, { step: 10 }),
        ingredient('taco_087', 10, 0, 30, { step: 5 }),
      ],
    },
  ],
};

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function getFoodById(id: string): Food | undefined {
  return TACO_DATABASE.find(f => f.id === id);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const MEAL_TEMPLATES: Record<number, Pick<MealConfig, 'name' | 'timing'>[]> = {
  3: [{ name: 'Café da Manhã', timing: 'regular' }, { name: 'Almoço', timing: 'regular' }, { name: 'Jantar', timing: 'regular' }],
  4: [{ name: 'Café da Manhã', timing: 'regular' }, { name: 'Almoço', timing: 'regular' }, { name: 'Pré-treino', timing: 'pre_workout' }, { name: 'Jantar', timing: 'regular' }],
  5: [{ name: 'Café da Manhã', timing: 'regular' }, { name: 'Almoço', timing: 'regular' }, { name: 'Pré-treino', timing: 'pre_workout' }, { name: 'Pós-treino', timing: 'post_workout' }, { name: 'Jantar', timing: 'regular' }],
  6: [{ name: 'Café da Manhã', timing: 'regular' }, { name: 'Lanche da Manhã', timing: 'regular' }, { name: 'Almoço', timing: 'regular' }, { name: 'Pré-treino', timing: 'pre_workout' }, { name: 'Pós-treino', timing: 'post_workout' }, { name: 'Jantar', timing: 'regular' }],
  7: [{ name: 'Café da Manhã', timing: 'regular' }, { name: 'Lanche da Manhã', timing: 'regular' }, { name: 'Almoço', timing: 'regular' }, { name: 'Lanche da Tarde', timing: 'regular' }, { name: 'Pré-treino', timing: 'pre_workout' }, { name: 'Pós-treino', timing: 'post_workout' }, { name: 'Jantar', timing: 'regular' }],
  8: [{ name: 'Café da Manhã', timing: 'regular' }, { name: 'Lanche da Manhã', timing: 'regular' }, { name: 'Almoço', timing: 'regular' }, { name: 'Lanche da Tarde', timing: 'regular' }, { name: 'Pré-treino', timing: 'pre_workout' }, { name: 'Pós-treino', timing: 'post_workout' }, { name: 'Jantar', timing: 'regular' }, { name: 'Ceia', timing: 'regular' }],
};

function buildMealConfigs(mealCount: number): MealConfig[] {
  const templates = MEAL_TEMPLATES[clamp(Math.round(mealCount), 3, 8)];
  const weights = templates.map(meal => {
    const isMainMeal = meal.name === 'Almoço' || meal.name === 'Jantar';
    const isWorkoutMeal = meal.timing !== 'regular';
    const isBreakfast = meal.name === 'Café da Manhã';
    const isBedtime = meal.name === 'Ceia';

    return {
      protein: isMainMeal ? 1.35 : isWorkoutMeal ? 1.2 : isBreakfast ? 1.2 : isBedtime ? 0.9 : 0.7,
      carbs: isMainMeal ? 1.25 : isWorkoutMeal ? 1.45 : isBreakfast ? 1.15 : isBedtime ? 0.5 : 0.7,
      fat: isMainMeal ? 1.5 : isWorkoutMeal ? 0.35 : isBreakfast ? 1.3 : isBedtime ? 1 : 0.8,
    };
  });
  const totals = weights.reduce(
    (sum, weight) => ({
      protein: sum.protein + weight.protein,
      carbs: sum.carbs + weight.carbs,
      fat: sum.fat + weight.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  return templates.map((meal, index) => ({
    ...meal,
    proteinPct: weights[index].protein / totals.protein,
    carbsPct: weights[index].carbs / totals.carbs,
    fatPct: weights[index].fat / totals.fat,
  }));
}

function getRecipesForMeal(mealName: string): AthleteMealRecipe[] {
  const key = mealName === 'Lanche da Tarde' ? 'Lanche da Manhã' : mealName;
  return ATHLETE_MEAL_RECIPES[key] || [];
}

function validateRecipeDefinition(mealName: string, recipe: AthleteMealRecipe): string[] {
  const errors: string[] = [];
  const ids = recipe.ingredients.map(item => item.foodId);
  const foods = recipe.ingredients.map(item => getFoodById(item.foodId)).filter((food): food is Food => Boolean(food));

  if (recipe.ingredients.length < 2) errors.push('deve conter pelo menos dois ingredientes');
  if (new Set(ids).size !== ids.length) errors.push('contém ingredientes duplicados');

  for (const item of recipe.ingredients) {
    if (!getFoodById(item.foodId)) errors.push(`alimento inexistente: ${item.foodId}`);
    if (item.minGrams < 0 || item.maxGrams < item.minGrams) errors.push(`limites inválidos: ${item.foodId}`);
    if (item.preferredGrams < item.minGrams || item.preferredGrams > item.maxGrams) {
      errors.push(`porção preferida fora dos limites: ${item.foodId}`);
    }
    if (item.fixed && (item.minGrams !== item.maxGrams || item.preferredGrams !== item.minGrams)) {
      errors.push(`ingrediente fixo com porções divergentes: ${item.foodId}`);
    }
  }

  if (!foods.some(food => food.macros.protein >= 8)) errors.push('não possui fonte relevante de proteína');
  if (!foods.some(food => food.macros.carbs >= 10)) errors.push('não possui fonte relevante de carboidrato');
  if ((mealName === 'Almoço' || mealName === 'Jantar')
    && !foods.some(food => food.category === 'Verduras, hortaliças e derivados')) {
    errors.push('refeição principal sem verdura ou legume');
  }

  return errors;
}

function selectRecipe(mealName: string, variation: number, strategy: DietStrategy): AthleteMealRecipe {
  const recipes = getRecipesForMeal(mealName);
  const varietyRecipes = recipes.filter(recipe => !recipe.budget);
  const selected = strategy === 'budget'
    ? recipes.find(recipe => recipe.budget)
    : varietyRecipes[variation % varietyRecipes.length];

  if (!selected) throw new Error(`Nenhuma receita esportiva disponível para ${mealName}`);
  const errors = validateRecipeDefinition(mealName, selected);
  if (errors.length > 0) {
    throw new Error(`Receita esportiva inválida (${mealName} — ${selected.name}): ${errors.join('; ')}`);
  }
  return selected;
}

function macroError(macros: Macros, target: Macros): number {
  const relative = (actual: number, expected: number) => Math.abs(actual - expected) / Math.max(expected, 1);
  return relative(macros.calories, target.calories) * 2
    + relative(macros.protein, target.protein) * 4
    + relative(macros.carbs, target.carbs) * 1.5
    + relative(macros.fat, target.fat) * 1.5;
}

interface PreparedIngredient extends RecipeIngredient {
  food: Food;
  grams: number;
}

function getMacrosForIngredients(ingredients: PreparedIngredient[]): Macros {
  return sumMacros(ingredients.map(item => calculatePortionMacros(item.food, item.grams)));
}

function getCandidateGrams(item: PreparedIngredient): number[] {
  if (item.fixed) return [item.preferredGrams];
  const step = item.step || 5;
  const values = new Set<number>([item.minGrams, item.maxGrams, item.preferredGrams]);
  for (let value = item.minGrams; value <= item.maxGrams; value += step) {
    values.add(Math.round(value));
  }
  return [...values].sort((a, b) => a - b);
}

function optimizeRecipePortions(recipe: AthleteMealRecipe, target: Macros): PreparedIngredient[] {
  let result = recipe.ingredients
    .map(item => {
      const food = getFoodById(item.foodId);
      if (!food) return null;
      return {
        ...item,
        food,
        grams: clamp(item.preferredGrams, item.minGrams, item.maxGrams),
      } satisfies PreparedIngredient;
    })
    .filter((item): item is PreparedIngredient => Boolean(item));

  for (let pass = 0; pass < 5; pass += 1) {
    for (let index = 0; index < result.length; index += 1) {
      const item = result[index];
      let bestGrams = item.grams;
      let bestError = macroError(getMacrosForIngredients(result), target);

      for (const grams of getCandidateGrams(item)) {
        const candidate = result.map((ingredientItem, ingredientIndex) =>
          ingredientIndex === index ? { ...ingredientItem, grams } : ingredientItem
        );
        const error = macroError(getMacrosForIngredients(candidate), target);
        if (error < bestError) {
          bestError = error;
          bestGrams = grams;
        }
      }

      result[index] = { ...item, grams: bestGrams };
    }
  }

  return result.filter(item => item.grams > 0);
}

// ============================================================
// GERADOR DE REFEIÇÃO
// ============================================================

function generateMeal(
  config: MealConfig,
  targetMacros: Macros,
  variation: number,
  strategy: DietStrategy,
): Meal {
  const mealName = config.name;
  const recipe = selectRecipe(mealName, variation, strategy);

  // Proteína é distribuída ao longo do dia; carboidratos são priorizados perto
  // do treino; e a maior parte da gordura fica nas refeições regulares.
  const mealTargetProtein = targetMacros.protein * config.proteinPct;
  const mealTargetCarbs = targetMacros.carbs * config.carbsPct;
  const mealTargetFat = targetMacros.fat * config.fatPct;
  const mealTargetCalories = mealTargetProtein * 4 + mealTargetCarbs * 4 + mealTargetFat * 9;
  const optimizedFoods = optimizeRecipePortions(recipe, {
    calories: mealTargetCalories,
    protein: mealTargetProtein,
    carbs: mealTargetCarbs,
    fat: mealTargetFat,
  });
  const portionMacros = optimizedFoods.map(f => calculatePortionMacros(f.food, f.grams));
  const totalMacros = sumMacros(portionMacros);

  return {
    id: Crypto.randomUUID(),
    name: `${mealName} — ${recipe.name}`,
    timing: config.timing,
    foods: optimizedFoods.map((f, i) => ({
      food: f.food,
      grams: f.grams,
      ...getPortionQuantity(f.food, f.grams),
      macros: portionMacros[i],
    })),
    totalMacros,
  };
}

// ============================================================
// PORTÃO OBRIGATÓRIO DE VALIDAÇÃO
// ============================================================

export interface AthleteMealPlanValidation {
  valid: boolean;
  errors: string[];
  macroPercentages: Pick<Macros, 'calories' | 'protein' | 'carbs' | 'fat'>;
}

const PLAN_MACRO_RANGES = {
  calories: { min: 90, max: 110 },
  protein: { min: 90, max: 120 },
  carbs: { min: 85, max: 120 },
  fat: { min: 70, max: 125 },
} as const;

function percentOfTarget(actual: number, target: number): number {
  return target > 0 ? actual / target * 100 : 0;
}

function validateGeneratedMeal(meal: Meal): string[] {
  const errors: string[] = [];
  const separator = ' — ';
  const separatorIndex = meal.name.indexOf(separator);
  if (separatorIndex < 0) return [`${meal.name}: não está vinculada a uma receita validada`];

  const mealName = meal.name.slice(0, separatorIndex);
  const recipeName = meal.name.slice(separatorIndex + separator.length);
  const recipe = getRecipesForMeal(mealName).find(item => item.name === recipeName);
  if (!recipe) return [`${meal.name}: receita não cadastrada`];

  const portionsByFoodId = new Map(meal.foods.map(portion => [portion.food.id, portion]));
  if (portionsByFoodId.size !== meal.foods.length) errors.push(`${meal.name}: alimento duplicado`);

  for (const portion of meal.foods) {
    const definition = recipe.ingredients.find(item => item.foodId === portion.food.id);
    if (!definition) {
      errors.push(`${meal.name}: ${portion.food.name} está fora da receita`);
      continue;
    }
    if (!Number.isFinite(portion.grams)
      || portion.grams < definition.minGrams
      || portion.grams > definition.maxGrams) {
      errors.push(`${meal.name}: porção de ${portion.food.name} fora dos limites`);
    }
  }

  for (const definition of recipe.ingredients.filter(item => item.minGrams > 0)) {
    if (!portionsByFoodId.has(definition.foodId)) {
      errors.push(`${meal.name}: ingrediente obrigatório ausente (${definition.foodId})`);
    }
  }

  const recalculated = sumMacros(meal.foods.map(portion => calculatePortionMacros(portion.food, portion.grams)));
  for (const macro of ['calories', 'protein', 'carbs', 'fat'] as const) {
    if (Math.abs(recalculated[macro] - meal.totalMacros[macro]) > 0.1) {
      errors.push(`${meal.name}: total de ${macro} inconsistente`);
    }
  }

  return errors;
}

export function validateAthleteMealPlan(plan: MealPlan, profile: UserProfile): AthleteMealPlanValidation {
  const errors = plan.meals.flatMap(validateGeneratedMeal);
  const target = calculateMacros(profile);
  const recalculatedTotal = sumMacros(plan.meals.map(meal => meal.totalMacros));
  const macroPercentages = {
    calories: percentOfTarget(recalculatedTotal.calories, target.calories),
    protein: percentOfTarget(recalculatedTotal.protein, target.protein),
    carbs: percentOfTarget(recalculatedTotal.carbs, target.carbs),
    fat: percentOfTarget(recalculatedTotal.fat, target.fat),
  };

  if (plan.meals.length < 3 || plan.meals.length > 8) errors.push('quantidade de refeições fora do intervalo de 3 a 8');
  if (plan.goal !== profile.goal) errors.push('objetivo do plano diferente do perfil');

  for (const macro of ['calories', 'protein', 'carbs', 'fat'] as const) {
    if (Math.abs(recalculatedTotal[macro] - plan.totalMacros[macro]) > 0.1) {
      errors.push(`total diário de ${macro} inconsistente`);
    }
    const range = PLAN_MACRO_RANGES[macro];
    if (macroPercentages[macro] < range.min || macroPercentages[macro] > range.max) {
      errors.push(`${macro} fora da faixa validada (${Math.round(macroPercentages[macro])}% da meta)`);
    }
  }

  return { valid: errors.length === 0, errors, macroPercentages };
}

// ============================================================
// GERADOR DE DIETA PRINCIPAL
// ============================================================

export function generateDiet(
  profile: UserProfile,
  optionIndex: number = 0,
  mealCount: number = 8,
  strategy: DietStrategy = 'variety',
): MealPlan {
  const targetMacros = calculateMacros(profile);

  // Seleciona distribuição baseada no esporte
  const mealConfigs = buildMealConfigs(mealCount);

  // Gera refeições com variação
  const meals: Meal[] = mealConfigs.map(config => 
    generateMeal(config, targetMacros, optionIndex, strategy)
  );

  // Calcula totais
  const totalMacros = sumMacros(meals.map(m => m.totalMacros));

  // Nome do plano
  const goalLabel = getGoalLabel(profile.goal);
  const sportLabel = getSportOption(profile.sport).shortLabel;
  const optionLabel = strategy === 'budget' ? 'Opção Econômica' : `Opção ${optionIndex + 1}`;

  const plan: MealPlan = {
    id: Crypto.randomUUID(),
    name: `${goalLabel} ${sportLabel} - ${optionLabel}`,
    goal: profile.goal,
    meals,
    totalMacros,
    createdAt: new Date().toISOString(),
    supplements: getSupplementRecommendations(profile),
  };

  const validation = validateAthleteMealPlan(plan, profile);
  if (!validation.valid) {
    throw new Error(`Plano alimentar reprovado pela validação: ${validation.errors.join('; ')}`);
  }

  return plan;
}

export function generateBudgetDiet(profile: UserProfile, mealCount: number = 8): MealPlan {
  return generateDiet(profile, 2, mealCount, 'budget');
}

// ============================================================
// GERAR 3 OPÇÕES DE CARDÁPIO
// ============================================================

export function generateDietOptions(profile: UserProfile, mealCount: number = 8): MealPlan[] {
  return [
    generateDiet(profile, 0, mealCount),
    generateDiet(profile, 1, mealCount),
    generateBudgetDiet(profile, mealCount),
  ];
}

export function getSupplementRecommendations(profile: UserProfile) {
  const recommendations = [];
  if (isStrengthFocusedSport(profile.sport)) {
    recommendations.push({
      name: 'Creatina monohidratada',
      dose: '3–5 g/dia',
      timing: 'Diariamente, no horário mais fácil de manter',
      reason: 'Pode apoiar força, potência e ganho de massa magra durante o treinamento.',
      caution: 'Converse com médico ou nutricionista em caso de doença renal, gestação ou uso de medicamentos.',
    });
  }
  recommendations.push({
    name: 'Proteína em pó (opcional)',
    dose: 'Somente a quantidade necessária para completar a meta diária',
    timing: 'Em uma refeição com pouca proteína ou após o treino',
    reason: 'É conveniência alimentar; não é necessária quando a meta é atingida com comida.',
  });
  if (isCombatSport(profile.sport)) {
    recommendations.push({
      name: 'Eletrólitos (condicional)',
      dose: 'Conforme rótulo e orientação profissional',
      timing: 'Treinos prolongados, muito quentes ou com suor intenso',
      reason: 'Pode ajudar a repor sódio e líquidos perdidos no suor.',
      caution: 'Evite uso indiscriminado em hipertensão, doença renal ou restrição de sódio.',
    });
  }
  return recommendations;
}

function getGoalLabel(goal: Goal): string {
  switch (goal) {
    case 'bulking': return 'Bulking';
    case 'cutting_conservative': return 'Cutting Conservador';
    case 'cutting_preparation': return 'Preparação';
    case 'cutting_precontest': return 'Pré-Competição';
    case 'maintenance': return 'Manutenção';
    default: return 'Personalizado';
  }
}

// ============================================================
// ANÁLISE E AJUSTES
// ============================================================

export function analyzeDiet(plan: MealPlan, profile: UserProfile): {
  adequacy: string;
  adjustments: string[];
  score: number;
  summary: {
    calories: { target: number; actual: number; pct: number };
    protein: { target: number; actual: number; pct: number };
    carbs: { target: number; actual: number; pct: number };
    fat: { target: number; actual: number; pct: number };
    proteinPerKg: number;
    mealsCount: number;
  };
} {
  const targetMacros = calculateMacros(profile);
  const total = plan.totalMacros;

  const adjustments: string[] = [];
  let score = 100;

  // Calorias
  const caloriePct = Math.round((total.calories / targetMacros.calories) * 100);
  if (caloriePct < 90) {
    adjustments.push(`Calorias abaixo da meta (${caloriePct}%)`);
    score -= 15;
  } else if (caloriePct > 110) {
    adjustments.push(`Calorias acima da meta (${caloriePct}%)`);
    score -= 10;
  }

  // Proteína
  const proteinPerKg = total.protein / profile.weight;
  const proteinPct = Math.round((total.protein / targetMacros.protein) * 100);
  if (proteinPct < 90) {
    adjustments.push(`Proteína abaixo da meta (${proteinPct}%)`);
    score -= 20;
  } else if (proteinPct > 115) {
    adjustments.push(`Proteína acima da meta (${proteinPct}%)`);
    score -= 10;
  }

  // Carboidratos
  const carbsPct = Math.round((total.carbs / targetMacros.carbs) * 100);
  if (carbsPct < 85) {
    adjustments.push(`Carboidratos abaixo da meta (${carbsPct}%)`);
    score -= 10;
  } else if (carbsPct > 115) {
    adjustments.push(`Carboidratos acima da meta (${carbsPct}%)`);
    score -= 10;
  }

  // Gordura
  const fatPct = Math.round((total.fat / targetMacros.fat) * 100);
  if (fatPct < 80) {
    adjustments.push(`Gordura abaixo da meta (${fatPct}%)`);
    score -= 10;
  } else if (fatPct > 120) {
    adjustments.push(`Gordura acima da meta (${fatPct}%)`);
    score -= 10;
  }

  // Adequação geral
  let adequacy = 'Excelente';
  if (score < 70) adequacy = 'Precisa ajustes';
  else if (score < 85) adequacy = 'Bom';
  else if (score < 95) adequacy = 'Muito bom';

  return {
    adequacy,
    adjustments,
    score: Math.max(0, score),
    summary: {
      calories: { target: targetMacros.calories, actual: total.calories, pct: caloriePct },
      protein: { target: targetMacros.protein, actual: total.protein, pct: proteinPct },
      carbs: { target: targetMacros.carbs, actual: total.carbs, pct: carbsPct },
      fat: { target: targetMacros.fat, actual: total.fat, pct: fatPct },
      proteinPerKg,
      mealsCount: plan.meals.length,
    },
  };
}

// ============================================================
// SUGESTÕES DE ALIMENTOS
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
