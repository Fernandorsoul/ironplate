import { generateDiet, getSupplementRecommendations } from '../src/utils/dietGenerator';
import { UserProfile } from '../src/types';

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

  it('adds conservative sport-specific supplement suggestions', () => {
    const recommendations = getSupplementRecommendations(profile);
    expect(recommendations.some(item => item.name.includes('Creatina'))).toBe(true);
    expect(recommendations.some(item => item.name.includes('Eletrólitos'))).toBe(true);
    expect(recommendations.every(item => item.dose && item.reason)).toBe(true);
  });
});
