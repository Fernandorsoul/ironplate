import { calculateMacros } from '../src/utils/calculations';
import { generateDiet, validateAthleteMealPlan } from '../src/utils/dietGenerator';
import type { UserProfile } from '../src/types';

const profiles: UserProfile[] = [
  {
    name: 'Atleta manutenção',
    age: 30,
    weight: 80,
    height: 180,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintenance',
    sport: 'bodybuilding',
  },
  {
    name: 'Atleta cutting',
    age: 30,
    weight: 60,
    height: 165,
    gender: 'female',
    activityLevel: 'light',
    goal: 'cutting_conservative',
    sport: 'bjj',
  },
  {
    name: 'Atleta pré-contest',
    age: 40,
    weight: 120,
    height: 170,
    gender: 'male',
    activityLevel: 'sedentary',
    goal: 'cutting_precontest',
    sport: 'bodybuilding',
  },
];

const percent = (actual: number, expected: number) => actual / expected * 100;

describe('athlete meal plans', () => {
  it.each(profiles)('keeps complete meal plans close to the macro target for $name', profile => {
    const target = calculateMacros(profile);

    for (const mealCount of [3, 4, 6, 8]) {
      for (const option of [0, 1, 2]) {
        const strategy = option === 2 ? 'budget' : 'variety';
        const plan = generateDiet(profile, option, mealCount, strategy);
        const validation = validateAthleteMealPlan(plan, profile);

        expect(validation).toMatchObject({ valid: true, errors: [] });
        expect(percent(plan.totalMacros.calories, target.calories)).toBeGreaterThanOrEqual(90);
        expect(percent(plan.totalMacros.calories, target.calories)).toBeLessThanOrEqual(110);
        expect(percent(plan.totalMacros.protein, target.protein)).toBeGreaterThanOrEqual(90);
        expect(percent(plan.totalMacros.protein, target.protein)).toBeLessThanOrEqual(120);
        expect(percent(plan.totalMacros.carbs, target.carbs)).toBeGreaterThanOrEqual(85);
        expect(percent(plan.totalMacros.carbs, target.carbs)).toBeLessThanOrEqual(120);
        expect(percent(plan.totalMacros.fat, target.fat)).toBeGreaterThanOrEqual(70);
        expect(percent(plan.totalMacros.fat, target.fat)).toBeLessThanOrEqual(125);
        expect(plan.meals.every(meal => meal.name.includes(' — '))).toBe(true);
        expect(plan.meals.every(meal => meal.foods.length >= 2)).toBe(true);
      }
    }
  });

  it('keeps whey nutrition on a per-100g basis so a 30g scoop is correct', () => {
    const plan = generateDiet(profiles[0], 0, 6);
    const whey = plan.meals.flatMap(meal => meal.foods).find(portion => portion.food.id === 'taco_076');

    expect(whey).toBeDefined();
    expect(whey!.food.macros.protein).toBe(80);
    expect(whey!.food.macros.calories).toBe(400);
  });

  it('rejects a food inserted outside the validated recipe', () => {
    const plan = generateDiet(profiles[0], 0, 4);
    const breakfast = plan.meals[0];
    const lunchFood = plan.meals[1].foods[0];
    const tampered = {
      ...plan,
      meals: [
        { ...breakfast, foods: [...breakfast.foods, lunchFood] },
        ...plan.meals.slice(1),
      ],
    };

    const validation = validateAthleteMealPlan(tampered, profiles[0]);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(error => error.includes('está fora da receita'))).toBe(true);
  });
});
