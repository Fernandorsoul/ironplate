// Diet Generator v2 — Baseado em evidências científicas de nutrição esportiva
// Fontes: ISSN, ACSM, NSCA, TACO

import { Food, Meal, MealPlan, MealTiming, Macros, UserProfile, Goal } from '../types';
import { TACO_DATABASE } from '../constants/taco';
import { calculateMacros, calculatePortionMacros, sumMacros, calculateTDEE, calculateTargetCalories } from './calculations';

// ============================================================
// CONFIGURAÇÕES BASEADAS EM EVIDÊNCIAS
// ============================================================

// Distribuição de macros por refeição (% do total diário)
// Baseado em: ISSN Position Stand (2017) - Meal Frequency and Timing
const MEAL_DISTRIBUTION: Record<string, { pct: number; timing: MealTiming }[]> = {
  bodybuilding: [
    { pct: 0.20, timing: 'regular' },           // Café da manhã
    { pct: 0.10, timing: 'regular' },           // Lanche manhã
    { pct: 0.25, timing: 'regular' },           // Almoço
    { pct: 0.15, timing: 'pre_workout' },       // Pré-treino
    { pct: 0.10, timing: 'post_workout' },      // Pós-treino
    { pct: 0.20, timing: 'regular' },           // Jantar
  ],
  bjj: [
    { pct: 0.25, timing: 'regular' },           // Café da manhã
    { pct: 0.30, timing: 'regular' },           // Almoço
    { pct: 0.15, timing: 'pre_workout' },       // Pré-treino
    { pct: 0.10, timing: 'post_workout' },      // Pós-treino
    { pct: 0.20, timing: 'regular' },           // Jantar
  ],
  both: [
    { pct: 0.20, timing: 'regular' },           // Café da manhã
    { pct: 0.10, timing: 'regular' },           // Lanche manhã
    { pct: 0.25, timing: 'regular' },           // Almoço
    { pct: 0.15, timing: 'pre_workout' },       // Pré-treino
    { pct: 0.10, timing: 'post_workout' },      // Pós-treino
    { pct: 0.20, timing: 'regular' },           // Jantar
  ],
};

// Nomes das refeições
const MEAL_NAMES: Record<string, string[]> = {
  bodybuilding: ['Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Pré-treino', 'Pós-treino', 'Jantar'],
  bjj: ['Café da Manhã', 'Almoço', 'Pré-treino', 'Pós-treino', 'Jantar'],
  both: ['Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Pré-treino', 'Pós-treino', 'Jantar'],
};

// ============================================================
// BANCOS DE ALIMENTOS POR FUNÇÃO
// ============================================================

// Proteínas por velocidade de absorção
const PROTEIN_FAST = ['taco_076']; // Whey protein (rápida)
const PROTEIN_MEDIUM = ['taco_064', 'taco_063', 'taco_047']; // Clara ovo, ovo inteiro, tilápia
const PROTEIN_SLOW = ['taco_069', 'taco_071']; // Iogurte, cottage

// Proteína por refeição
const PROTEIN_BY_MEAL: Record<string, string[]> = {
  'Café da Manhã': ['taco_063', 'taco_064', 'taco_076', 'taco_069'], // Ovo, clara, whey, iogurte
  'Lanche da Manhã': ['taco_076', 'taco_069', 'taco_071'], // Whey, iogurte, cottage
  'Almoço': ['taco_051', 'taco_053', 'taco_054', 'taco_045', 'taco_059'], // Frango, patinho, alcatra, salmão, peru
  'Pré-treino': ['taco_076', 'taco_064'], // Whey, clara (rápida)
  'Pós-treino': ['taco_076', 'taco_064'], // Whey, clara (rápida para síntese)
  'Jantar': ['taco_045', 'taco_047', 'taco_051', 'taco_054'], // Salmão, tilápia, frango, alcatra
};

// Carboidratos por índice glicêmico e timing
const CARBS_LOW_GI = ['taco_003', 'taco_002', 'taco_009', 'taco_014']; // Aveia, arroz integral, batata-doce, quinoa
const CARBS_MEDIUM_GI = ['taco_028', 'taco_029', 'taco_001']; // Banana, arroz branco
const CARBS_HIGH_GI = ['taco_028', 'taco_092', 'taco_001']; // Banana madura, mel, arroz branco

// Carboidrato por refeição (baseado em timing e IG)
const CARBS_BY_MEAL: Record<string, string[]> = {
  'Café da Manhã': ['taco_003', 'taco_028', 'taco_029'], // Aveia, banana
  'Lanche da Manhã': ['taco_028', 'taco_030'], // Banana, maçã
  'Almoço': ['taco_001', 'taco_002', 'taco_009'], // Arroz, batata-doce
  'Pré-treino': ['taco_003', 'taco_009', 'taco_028'], // Aveia, batata-doce (baixo/médio IG)
  'Pós-treino': ['taco_028', 'taco_001'], // Banana madura, arroz branco (alto IG)
  'Jantar': ['taco_002', 'taco_014', 'taco_004'], // Arroz integral, quinoa, macarrão
};

// Gorduras por timing
const FAT_BY_MEAL: Record<string, string[]> = {
  'Café da Manhã': ['taco_083', 'taco_087'], // Amêndoas, amendoim
  'Lanche da Manhã': ['taco_038'], // Abacate
  'Almoço': ['taco_041'], // Azeite
  'Pré-treino': [], // Evitar antes do treino
  'Pós-treino': [], // Evitar pós-treino
  'Jantar': ['taco_041', 'taco_083'], // Azeite, amêndoas
};

// Verduras (fixo, baixa caloria)
const VEGGIES = ['taco_016', 'taco_017', 'taco_019', 'taco_020', 'taco_021', 'taco_022', 'taco_026'];

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function getFoodById(id: string): Food | undefined {
  return TACO_DATABASE.find(f => f.id === id);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// GERADOR DE DIETA CIENTÍFICO
// ============================================================

export function generateDiet(profile: UserProfile): MealPlan {
  const targetMacros = calculateMacros(profile);
  const tdee = calculateTDEE(profile);

  // Seleciona distribuição baseada no esporte
  const sportKey = profile.sport === 'both' ? 'both' : profile.sport;
  const distribution = MEAL_DISTRIBUTION[sportKey] || MEAL_DISTRIBUTION.bodybuilding;
  const mealNames = MEAL_NAMES[sportKey] || MEAL_NAMES.bodybuilding;

  // Gera refeições
  const meals: Meal[] = distribution.map((dist, index) => {
    const mealName = mealNames[index];
    return generateMealScientific(
      mealName,
      dist.timing,
      dist.pct,
      targetMacros,
      profile
    );
  });

  // Calcula totais
  const totalMacros = sumMacros(meals.map(m => m.totalMacros));

  // Nome do plano
  const goalLabel = profile.goal === 'bulking' ? 'Bulking' :
                    profile.goal === 'cutting' ? 'Cutting' : 'Manutenção';
  const sportLabel = profile.sport === 'bodybuilding' ? 'Bodybuilding' :
                     profile.sport === 'bjj' ? 'BJJ' : 'Atleta';

  return {
    id: `diet_${Date.now()}`,
    name: `Plano ${goalLabel} ${sportLabel}`,
    goal: profile.goal,
    meals,
    totalMacros,
    createdAt: new Date().toISOString(),
  };
}

function generateMealScientific(
  mealName: string,
  timing: MealTiming,
  pctOfTotal: number,
  targetMacros: Macros,
  profile: UserProfile
): Meal {
  const foods: { food: Food; grams: number }[] = [];

  // Macros alvo para esta refeição
  const mealTargetCalories = Math.round(targetMacros.calories * pctOfTotal);
  const mealTargetProtein = Math.round(targetMacros.protein * pctOfTotal);
  const mealTargetCarbs = Math.round(targetMacros.carbs * pctOfTotal);
  const mealTargetFat = Math.round(targetMacros.fat * pctOfTotal);

  // === PROTEÍNA ===
  // Baseado em: ISSN recomenda 0.4-0.55 g/kg por refeição para síntese proteica
  const proteinSources = PROTEIN_BY_MEAL[mealName] || PROTEIN_MEDIUM;
  const proteinPerSource = Math.round(mealTargetProtein / Math.min(proteinSources.length, 2));

  // Seleciona até 2 fontes de proteína
  const selectedProteins = proteinSources.slice(0, 2);
  for (const sourceId of selectedProteins) {
    const food = getFoodById(sourceId);
    if (!food) continue;

    let grams = calculateGramsForMacro(food, 'protein', proteinPerSource);

    // Ajusta por limites realistas baseados no alimento
    if (sourceId === 'taco_076') { // Whey
      grams = clamp(grams, 25, 50); // 25-50g de whey
    } else if (sourceId === 'taco_063') { // Ovo inteiro
      grams = clamp(grams, 50, 200); // 1-4 ovos
    } else if (sourceId === 'taco_064') { // Clara
      grams = clamp(grams, 60, 300); // 2-10 claras
    } else {
      grams = clamp(grams, 80, 300); // 80-300g de proteína sólida
    }

    foods.push({ food, grams });
  }

  // === CARBOIDRATO ===
  // Baseado em: timing e índice glicêmico
  const carbSources = CARBS_BY_MEAL[mealName] || CARBS_MEDIUM_GI;
  const carbsPerSource = Math.round(mealTargetCarbs / Math.min(carbSources.length, 2));

  const selectedCarbs = carbSources.slice(0, 2);
  for (const sourceId of selectedCarbs) {
    const food = getFoodById(sourceId);
    if (!food) continue;

    let grams = calculateGramsForMacro(food, 'carbs', carbsPerSource);

    // Limites realistas
    if (sourceId === 'taco_003') { // Aveia
      grams = clamp(grams, 40, 100);
    } else if (sourceId === 'taco_028' || sourceId === 'taco_029') { // Banana
      grams = clamp(grams, 80, 200);
    } else if (sourceId === 'taco_001' || sourceId === 'taco_002') { // Arroz
      grams = clamp(grams, 100, 300);
    } else if (sourceId === 'taco_009') { // Batata-doce
      grams = clamp(grams, 100, 300);
    } else {
      grams = clamp(grams, 50, 300);
    }

    foods.push({ food, grams });
  }

  // === GORDURA ===
  // Baseado em: timing (evitar pré/pós-treino)
  const fatSources = FAT_BY_MEAL[mealName] || [];
  if (fatSources.length > 0 && mealTargetFat > 5) {
    const sourceId = pickRandom(fatSources);
    const food = getFoodById(sourceId);
    if (food) {
      let grams = calculateGramsForMacro(food, 'fat', mealTargetFat);

      // Gorduras têm porções menores
      if (sourceId === 'taco_041') { // Azeite
        grams = clamp(grams, 5, 20); // 5-20ml
      } else if (sourceId === 'taco_083' || sourceId === 'taco_087') { // Amêndoas/amendoim
        grams = clamp(grams, 15, 40); // 15-40g
      } else if (sourceId === 'taco_038') { // Abacate
        grams = clamp(grams, 50, 150);
      } else {
        grams = clamp(grams, 5, 30);
      }

      foods.push({ food, grams });
    }
  }

  // === VERDURAS (fixo, baixa caloria) ===
  // Almoço e jantar sempre têm verduras
  if (mealName === 'Almoço' || mealName === 'Jantar') {
    const veggie1 = getFoodById(pickRandom(VEGGIES));
    const veggie2 = getFoodById(pickRandom(VEGGIES));
    if (veggie1) foods.push({ food: veggie1, grams: 100 });
    if (veggie2 && veggie2.id !== veggie1?.id) foods.push({ food: veggie2, grams: 80 });
  }

  // Calcula macros totais da refeição
  const portionMacros = foods.map(f => calculatePortionMacros(f.food, f.grams));
  const totalMacros = sumMacros(portionMacros);

  return {
    id: `meal_${mealName}_${Date.now()}`,
    name: mealName,
    timing,
    foods: foods.map((f, i) => ({
      food: f.food,
      grams: f.grams,
      macros: portionMacros[i],
    })),
    totalMacros,
  };
}

// ============================================================
// ANÁLISE E AJUSTES
// ============================================================

export function analyzeDiet(plan: MealPlan, profile: UserProfile): {
  adequacy: string;
  adjustments: string[];
  score: number;
} {
  const targetMacros = calculateMacros(profile);
  const total = plan.totalMacros;

  const proteinRatio = total.protein / targetMacros.protein;
  const carbRatio = total.carbs / targetMacros.carbs;
  const fatRatio = total.fat / targetMacros.fat;
  const calorieRatio = total.calories / targetMacros.calories;

  const adjustments: string[] = [];
  let score = 100;

  // Análise de proteína (ISSN: 1.6-2.2 g/kg)
  const proteinPerKg = total.protein / profile.weight;
  if (proteinPerKg < 1.6) {
    adjustments.push(`Proteína baixa (${proteinPerKg.toFixed(1)} g/kg). Mínimo recomendado: 1.6 g/kg`);
    score -= 20;
  } else if (proteinPerKg > 2.5) {
    adjustments.push(`Proteína muito alta (${proteinPerKg.toFixed(1)} g/kg). Máximo recomendado: 2.2 g/kg`);
    score -= 10;
  }

  // Análise de calorias
  if (calorieRatio < 0.9) {
    adjustments.push(`Calorias abaixo da meta (${Math.round(calorieRatio * 100)}%)`);
    score -= 15;
  } else if (calorieRatio > 1.1) {
    adjustments.push(`Calorias acima da meta (${Math.round(calorieRatio * 100)}%)`);
    score -= 10;
  }

  // Análise de gordura (mínimo 20%)
  const fatPct = (total.fat * 9 / total.calories) * 100;
  if (fatPct < 20) {
    adjustments.push(`Gordura muito baixa (${Math.round(fatPct)}%). Mínimo: 20% das calorias`);
    score -= 15;
  }

  // Adequação geral
  let adequacy = 'Excelente';
  if (score < 70) adequacy = 'Precisa ajustes';
  else if (score < 85) adequacy = 'Bom';
  else if (score < 95) adequacy = 'Muito bom';

  return { adequacy, adjustments, score: Math.max(0, score) };
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
