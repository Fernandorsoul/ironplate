// Diet Generator v3 — Baseado em evidências científicas de nutrição esportiva
// Fontes: ISSN, ACSM, NSCA, TACO, Helms et al. (2014), Ruiz-Castellano et al. (2021)

import { Food, Meal, MealPlan, MealTiming, Macros, UserProfile, Goal } from '../types';
import { TACO_DATABASE } from '../constants/taco';
import { calculateMacros, calculatePortionMacros, sumMacros, calculateTDEE, calculateTargetCalories } from './calculations';

// ============================================================
// DISTRIBUIÇÃO DE REFEIÇÕES POR ESPORTE
// ============================================================

interface MealConfig {
  name: string;
  pct: number;
  timing: MealTiming;
}

const MEAL_CONFIGS: Record<string, MealConfig[]> = {
  bodybuilding: [
    { name: 'Café da Manhã', pct: 0.20, timing: 'regular' },
    { name: 'Lanche da Manhã', pct: 0.10, timing: 'regular' },
    { name: 'Almoço', pct: 0.25, timing: 'regular' },
    { name: 'Pré-treino', pct: 0.15, timing: 'pre_workout' },
    { name: 'Pós-treino', pct: 0.10, timing: 'post_workout' },
    { name: 'Jantar', pct: 0.20, timing: 'regular' },
  ],
  bjj: [
    { name: 'Café da Manhã', pct: 0.25, timing: 'regular' },
    { name: 'Almoço', pct: 0.30, timing: 'regular' },
    { name: 'Pré-treino', pct: 0.15, timing: 'pre_workout' },
    { name: 'Pós-treino', pct: 0.10, timing: 'post_workout' },
    { name: 'Jantar', pct: 0.20, timing: 'regular' },
  ],
  both: [
    { name: 'Café da Manhã', pct: 0.20, timing: 'regular' },
    { name: 'Lanche da Manhã', pct: 0.10, timing: 'regular' },
    { name: 'Almoço', pct: 0.25, timing: 'regular' },
    { name: 'Pré-treino', pct: 0.15, timing: 'pre_workout' },
    { name: 'Pós-treino', pct: 0.10, timing: 'post_workout' },
    { name: 'Jantar', pct: 0.20, timing: 'regular' },
  ],
};

// ============================================================
// BANCOS DE ALIMENTOS POR CATEGORIA
// ============================================================

const PROTEIN_SOURCES: Record<string, { id: string; name: string; min: number; max: number }[]> = {
  'Café da Manhã': [
    { id: 'taco_063', name: 'Ovo inteiro', min: 100, max: 200 },
    { id: 'taco_064', name: 'Clara de ovo', min: 100, max: 300 },
    { id: 'taco_069', name: 'Iogurte grego', min: 150, max: 300 },
  ],
  'Lanche da Manhã': [
    { id: 'taco_076', name: 'Whey protein', min: 25, max: 50 },
    { id: 'taco_069', name: 'Iogurte grego', min: 150, max: 200 },
    { id: 'taco_071', name: 'Cottage', min: 100, max: 200 },
  ],
  'Almoço': [
    { id: 'taco_051', name: 'Peito de frango', min: 150, max: 300 },
    { id: 'taco_053', name: 'Patinho', min: 150, max: 250 },
    { id: 'taco_054', name: 'Alcatra', min: 150, max: 250 },
    { id: 'taco_045', name: 'Salmão', min: 150, max: 250 },
    { id: 'taco_059', name: 'Peru', min: 150, max: 300 },
  ],
  'Pré-treino': [
    { id: 'taco_076', name: 'Whey protein', min: 25, max: 40 },
    { id: 'taco_064', name: 'Clara de ovo', min: 100, max: 200 },
  ],
  'Pós-treino': [
    { id: 'taco_076', name: 'Whey protein', min: 30, max: 50 },
    { id: 'taco_064', name: 'Clara de ovo', min: 100, max: 250 },
  ],
  'Jantar': [
    { id: 'taco_045', name: 'Salmão', min: 150, max: 250 },
    { id: 'taco_047', name: 'Tilápia', min: 150, max: 300 },
    { id: 'taco_051', name: 'Peito de frango', min: 150, max: 250 },
    { id: 'taco_054', name: 'Alcatra', min: 150, max: 200 },
  ],
};

const CARB_SOURCES: Record<string, { id: string; name: string; min: number; max: number }[]> = {
  'Café da Manhã': [
    { id: 'taco_003', name: 'Aveia', min: 40, max: 80 },
    { id: 'taco_028', name: 'Banana', min: 80, max: 150 },
    { id: 'taco_029', name: 'Banana nanica', min: 80, max: 150 },
  ],
  'Lanche da Manhã': [
    { id: 'taco_028', name: 'Banana', min: 80, max: 120 },
    { id: 'taco_030', name: 'Maçã', min: 120, max: 200 },
  ],
  'Almoço': [
    { id: 'taco_001', name: 'Arroz branco', min: 100, max: 250 },
    { id: 'taco_002', name: 'Arroz integral', min: 100, max: 250 },
    { id: 'taco_009', name: 'Batata-doce', min: 150, max: 300 },
  ],
  'Pré-treino': [
    { id: 'taco_003', name: 'Aveia', min: 40, max: 60 },
    { id: 'taco_009', name: 'Batata-doce', min: 100, max: 200 },
    { id: 'taco_028', name: 'Banana', min: 80, max: 120 },
  ],
  'Pós-treino': [
    { id: 'taco_028', name: 'Banana', min: 100, max: 200 },
    { id: 'taco_001', name: 'Arroz branco', min: 100, max: 200 },
  ],
  'Jantar': [
    { id: 'taco_002', name: 'Arroz integral', min: 100, max: 200 },
    { id: 'taco_014', name: 'Quinoa', min: 80, max: 150 },
    { id: 'taco_004', name: 'Macarrão', min: 100, max: 200 },
  ],
};

const FAT_SOURCES: Record<string, { id: string; name: string; min: number; max: number }[]> = {
  'Café da Manhã': [
    { id: 'taco_083', name: 'Amêndoas', min: 15, max: 30 },
    { id: 'taco_087', name: 'Amendoim', min: 15, max: 30 },
  ],
  'Lanche da Manhã': [
    { id: 'taco_038', name: 'Abacate', min: 50, max: 100 },
  ],
  'Almoço': [
    { id: 'taco_041', name: 'Azeite de oliva', min: 5, max: 15 },
  ],
  'Pré-treino': [],
  'Pós-treino': [],
  'Jantar': [
    { id: 'taco_041', name: 'Azeite de oliva', min: 5, max: 15 },
    { id: 'taco_083', name: 'Amêndoas', min: 15, max: 25 },
  ],
};

const VEGGIES = [
  { id: 'taco_016', name: 'Brócolis' },
  { id: 'taco_017', name: 'Couve-flor' },
  { id: 'taco_019', name: 'Espinafre' },
  { id: 'taco_020', name: 'Alface' },
  { id: 'taco_021', name: 'Tomate' },
  { id: 'taco_022', name: 'Cenoura' },
  { id: 'taco_026', name: 'Abobrinha' },
];

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function getFoodById(id: string): Food | undefined {
  return TACO_DATABASE.find(f => f.id === id);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTwo<T>(arr: T[]): [T, T] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculateGramsForMacro(food: Food, targetMacro: keyof Macros, targetAmount: number): number {
  const macroPer100g = food.macros[targetMacro];
  if (macroPer100g === 0) return 0;
  return Math.round((targetAmount / macroPer100g) * 100);
}

// ============================================================
// GERADOR DE REFEIÇÃO
// ============================================================

function generateMeal(
  config: MealConfig,
  targetMacros: Macros,
  profile: UserProfile,
  variation: number // 0, 1, or 2 for different options
): Meal {
  const foods: { food: Food; grams: number }[] = [];
  const mealName = config.name;

  // Macros alvo para esta refeição
  const mealTargetCalories = Math.round(targetMacros.calories * config.pct);
  const mealTargetProtein = Math.round(targetMacros.protein * config.pct);
  const mealTargetCarbs = Math.round(targetMacros.carbs * config.pct);
  const mealTargetFat = Math.round(targetMacros.fat * config.pct);

  // === PROTEÍNA ===
  const proteinOptions = PROTEIN_SOURCES[mealName] || PROTEIN_SOURCES['Almoço'];
  const proteinSource = proteinOptions[variation % proteinOptions.length];
  const proteinFood = getFoodById(proteinSource.id);
  
  if (proteinFood) {
    let grams = calculateGramsForMacro(proteinFood, 'protein', mealTargetProtein);
    grams = clamp(grams, proteinSource.min, proteinSource.max);
    foods.push({ food: proteinFood, grams });
  }

  // === CARBOIDRATO ===
  const carbOptions = CARB_SOURCES[mealName] || CARB_SOURCES['Almoço'];
  const carbSource = carbOptions[variation % carbOptions.length];
  const carbFood = getFoodById(carbSource.id);
  
  if (carbFood) {
    let grams = calculateGramsForMacro(carbFood, 'carbs', mealTargetCarbs);
    grams = clamp(grams, carbSource.min, carbSource.max);
    foods.push({ food: carbFood, grams });
  }

  // === GORDURA ===
  const fatOptions = FAT_SOURCES[mealName] || [];
  if (fatOptions.length > 0 && mealTargetFat > 5) {
    const fatSource = fatOptions[variation % fatOptions.length];
    const fatFood = getFoodById(fatSource.id);
    
    if (fatFood) {
      let grams = calculateGramsForMacro(fatFood, 'fat', mealTargetFat);
      grams = clamp(grams, fatSource.min, fatSource.max);
      foods.push({ food: fatFood, grams });
    }
  }

  // === VERDURAS (Almoço e Jantar) ===
  if (mealName === 'Almoço' || mealName === 'Jantar') {
    const [veg1, veg2] = pickTwo(VEGGIES);
    const vegFood1 = getFoodById(veg1.id);
    const vegFood2 = getFoodById(veg2.id);
    if (vegFood1) foods.push({ food: vegFood1, grams: 100 });
    if (vegFood2) foods.push({ food: vegFood2, grams: 80 });
  }

  // Calcula macros totais da refeição
  const portionMacros = foods.map(f => calculatePortionMacros(f.food, f.grams));
  const totalMacros = sumMacros(portionMacros);

  return {
    id: `meal_${mealName}_${Date.now()}_${variation}`,
    name: mealName,
    timing: config.timing,
    foods: foods.map((f, i) => ({
      food: f.food,
      grams: f.grams,
      macros: portionMacros[i],
    })),
    totalMacros,
  };
}

// ============================================================
// GERADOR DE DIETA PRINCIPAL
// ============================================================

export function generateDiet(profile: UserProfile, optionIndex: number = 0): MealPlan {
  const targetMacros = calculateMacros(profile);
  const tdee = calculateTDEE(profile);

  // Seleciona distribuição baseada no esporte
  const sportKey = profile.sport === 'both' ? 'both' : profile.sport;
  const mealConfigs = MEAL_CONFIGS[sportKey] || MEAL_CONFIGS.bodybuilding;

  // Gera refeições com variação
  const meals: Meal[] = mealConfigs.map(config => 
    generateMeal(config, targetMacros, profile, optionIndex)
  );

  // Calcula totais
  const totalMacros = sumMacros(meals.map(m => m.totalMacros));

  // Nome do plano
  const goalLabel = getGoalLabel(profile.goal);
  const sportLabel = profile.sport === 'bodybuilding' ? 'Bodybuilding' :
                     profile.sport === 'bjj' ? 'BJJ' : 'Atleta';
  const optionLabel = `Opção ${optionIndex + 1}`;

  return {
    id: `diet_${Date.now()}_${optionIndex}`,
    name: `${goalLabel} ${sportLabel} - ${optionLabel}`,
    goal: profile.goal,
    meals,
    totalMacros,
    createdAt: new Date().toISOString(),
  };
}

// ============================================================
// GERAR 3 OPÇÕES DE CARDÁPIO
// ============================================================

export function generateDietOptions(profile: UserProfile): MealPlan[] {
  return [
    generateDiet(profile, 0),
    generateDiet(profile, 1),
    generateDiet(profile, 2),
  ];
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
  if (proteinPerKg < 1.6) {
    adjustments.push(`Proteína baixa (${proteinPerKg.toFixed(1)} g/kg). Mínimo: 1.6 g/kg`);
    score -= 20;
  } else if (proteinPerKg > 3.0) {
    adjustments.push(`Proteína muito alta (${proteinPerKg.toFixed(1)} g/kg)`);
    score -= 5;
  }

  // Gordura
  const fatPct = Math.round((total.fat / targetMacros.fat) * 100);
  if (fatPct < 80) {
    adjustments.push(`Gordura muito baixa (${fatPct}% da meta)`);
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
      carbs: { target: targetMacros.carbs, actual: total.carbs, pct: Math.round((total.carbs / targetMacros.carbs) * 100) },
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
