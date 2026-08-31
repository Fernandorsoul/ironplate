export interface MacroValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function roundMacros(macros: MacroValues): MacroValues {
  return {
    calories: Math.round(macros.calories * 1000) / 1000,
    protein: Math.round(macros.protein * 1000) / 1000,
    carbs: Math.round(macros.carbs * 1000) / 1000,
    fat: Math.round(macros.fat * 1000) / 1000,
  };
}

export function calculateMacrosPer100Grams(macros: MacroValues, grams: number): MacroValues {
  if (!Number.isFinite(grams) || grams <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const factor = 100 / grams;
  return roundMacros({
    calories: macros.calories * factor,
    protein: macros.protein * factor,
    carbs: macros.carbs * factor,
    fat: macros.fat * factor,
  });
}

function calculatePortionMacros(
  portion: { food: { macros: MacroValues }; grams: number },
): MacroValues {
  const factor = portion.grams / 100;
  return roundMacros({
    calories: portion.food.macros.calories * factor,
    protein: portion.food.macros.protein * factor,
    carbs: portion.food.macros.carbs * factor,
    fat: portion.food.macros.fat * factor,
  });
}

function calculateMealTotals(foods: Array<{ macros: MacroValues }>): MacroValues {
  const totals = foods.reduce(
    (sum, portion) => ({
      calories: sum.calories + portion.macros.calories,
      protein: sum.protein + portion.macros.protein,
      carbs: sum.carbs + portion.macros.carbs,
      fat: sum.fat + portion.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return roundMacros(totals);
}

export function normalizeMealFoods<
  T extends { food: { macros: MacroValues }; grams: number; macros: MacroValues },
>(portions: T[]): { foods: T[]; totalMacros: MacroValues } {
  const foods = portions.map(portion => ({
    ...portion,
    macros: calculatePortionMacros(portion),
  }));
  return { foods, totalMacros: calculateMealTotals(foods) };
}
