import { generateDiet, getSupplementRecommendations } from '../src/utils/dietGenerator';
import { UserProfile } from '../src/types';
import { formatPortionAmount } from '../src/utils/portionDisplay';

const profile: UserProfile = {
  name: 'Atleta',
  age: 30,
  weight: 80,
  height: 180,
  gender: 'male',
  activityLevel: 'moderate',
  goal: 'maintenance',
  sport: 'both',
};

describe('diet generator', () => {
  it('generates eight meals by default', () => {
    expect(generateDiet(profile).meals).toHaveLength(8);
  });

  it.each([3, 4, 5, 6, 7, 8])('generates %i configurable meals', count => {
    const plan = generateDiet(profile, 0, count);
    expect(plan.meals).toHaveLength(count);
    expect(plan.totalMacros.calories).toBeGreaterThan(0);
    expect(plan.totalMacros.protein).toBeGreaterThan(0);
  });

  it('includes household measures and grams in every generated food portion', () => {
    const plan = generateDiet(profile);

    plan.meals.flatMap(meal => meal.foods).forEach(portion => {
      expect(portion.quantity).toBeGreaterThan(0);
      expect(portion.unit).toBeDefined();
      expect(formatPortionAmount(portion)).toMatch(/^aprox\./);
      expect(formatPortionAmount(portion)).toContain(`(${portion.grams} g)`);
    });
  });

  it('adds conservative sport-specific supplement suggestions', () => {
    const recommendations = getSupplementRecommendations(profile);
    expect(recommendations.some(item => item.name.includes('Creatina'))).toBe(true);
    expect(recommendations.some(item => item.name.includes('Eletrólitos'))).toBe(true);
    expect(recommendations.every(item => item.dose && item.reason)).toBe(true);
  });
});
