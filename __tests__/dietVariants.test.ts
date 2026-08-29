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
  });

  it('returns recommendations for each supported sport', () => {
    for (const sport of ['bodybuilding', 'bjj', 'both'] as const) {
      expect(getSupplementRecommendations({ ...baseProfile, sport }).length).toBeGreaterThan(0);
    }
  });
});
