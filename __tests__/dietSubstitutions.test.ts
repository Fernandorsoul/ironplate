import { TACO_DATABASE } from '../src/constants/taco';
import { calculatePortionMacros } from '../src/utils/calculations';
import {
  getFoodCostTier,
  getFoodSubstitutions,
  getPlanSubstitutions,
} from '../src/utils/dietSubstitutions';
import { FoodPortion, MealPlan } from '../src/types';

function portion(foodId: string, grams: number): FoodPortion {
  const food = TACO_DATABASE.find(item => item.id === foodId);
  if (!food) throw new Error(`Food ${foodId} not found`);
  return { food, grams, macros: calculatePortionMacros(food, grams) };
}

describe('diet substitutions', () => {
  it('offers cheaper protein with approximately the same protein amount', () => {
    const salmon = portion('taco_045', 150);
    const substitutions = getFoodSubstitutions(salmon, { onlyCheaper: true, limit: 5 });
    const chicken = substitutions.find(item => item.portion.food.id === 'taco_051');

    expect(chicken).toBeDefined();
    expect(chicken?.isCheaper).toBe(true);
    expect(chicken?.matchedMacro).toBe('protein');
    const proteinDifference = Math.abs((chicken?.portion.macros.protein || 0) - salmon.macros.protein);
    expect(proteinDifference / salmon.macros.protein).toBeLessThanOrEqual(0.05);
  });

  it('classifies quinoa above rice in the relative cost bands', () => {
    expect(getFoodCostTier('taco_014')).toBeGreaterThan(getFoodCostTier('taco_001'));

    const swaps = getFoodSubstitutions(portion('taco_014', 100), { onlyCheaper: true });
    expect(swaps.some(item => item.portion.food.id === 'taco_001')).toBe(true);
    expect(swaps.every(item => item.isCheaper)).toBe(true);
  });

  it('groups available swaps by meal', () => {
    const salmon = portion('taco_045', 150);
    const plan: MealPlan = {
      id: 'plan-1',
      name: 'Plano teste',
      goal: 'maintenance',
      meals: [{
        id: 'meal-1',
        name: 'Jantar',
        timing: 'regular',
        foods: [salmon],
        totalMacros: salmon.macros,
      }],
      totalMacros: salmon.macros,
      createdAt: '2026-08-29T00:00:00.000Z',
    };

    const groups = getPlanSubstitutions(plan, { onlyCheaper: true });
    expect(groups).toHaveLength(1);
    expect(groups[0].mealName).toBe('Jantar');
    expect(groups[0].items[0].alternatives.length).toBeGreaterThan(0);
  });
});
