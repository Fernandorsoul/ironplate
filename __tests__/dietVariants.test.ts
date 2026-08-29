import { generateDietOptions, getSupplementRecommendations } from '../src/utils/dietGenerator';
import type { Goal, Sport, UserProfile } from '../src/types';

const baseProfile: UserProfile = {
  name: 'Atleta',
  age: 30,
  weight: 75,
  height: 170,
  gender: 'female',
  activityLevel: 'active',
  goal: 'maintenance',
  sport: 'bodybuilding',
};

describe('diet variants', () => {
  it.each<[Goal, Sport]>([
    ['bulking', 'bodybuilding'],
    ['cutting_conservative', 'bjj'],
    ['cutting_preparation', 'both'],
    ['cutting_precontest', 'bodybuilding'],
  ])('generates complete options for %s / %s', (goal, sport) => {
    const options = generateDietOptions({ ...baseProfile, goal, sport }, 4);
    expect(options).toHaveLength(3);
    expect(options.every((option) => option.meals.length === 4)).toBe(true);
    expect(options.every((option) => option.totalMacros.calories > 0)).toBe(true);
    expect(options[2].name).toContain('Econômica');
  });

  it('returns recommendations for each supported sport', () => {
    for (const sport of ['bodybuilding', 'bjj', 'both'] as const) {
      expect(getSupplementRecommendations({ ...baseProfile, sport }).length).toBeGreaterThan(0);
    }
  });

  it('keeps premium staples out of the economic option when cheaper sources exist', () => {
    const economicOption = generateDietOptions(baseProfile, 4)[2];
    const foodIds = economicOption.meals.flatMap(meal => meal.foods.map(portion => portion.food.id));

    expect(foodIds).not.toEqual(expect.arrayContaining([
      'taco_014', // quinoa
      'taco_045', // salmon
      'taco_054', // alcatra
      'taco_076', // whey
      'taco_083', // almonds
    ]));
  });
});
