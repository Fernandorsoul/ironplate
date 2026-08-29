import { calculateHydration } from '../src/utils/hydration';
import { UserProfile } from '../src/types';

const profile: UserProfile = {
  name: 'Atleta',
  age: 30,
  weight: 80,
  height: 180,
  gender: 'female',
  activityLevel: 'active',
  goal: 'maintenance',
  sport: 'bodybuilding',
};

describe('hydration calculation', () => {
  it('calculates and rounds a practical target from body weight', () => {
    const result = calculateHydration(profile);

    expect(result.dailyTargetMl).toBe(2800);
    expect(result.dailyTargetLiters).toBe(2.8);
    expect(result.glasses250Ml).toBe(12);
    expect(result.bottles500Ml).toBe(6);
  });

  it('keeps the population reference separate and flags combat sports', () => {
    const female = calculateHydration({ ...profile, sport: 'bjj' });
    const male = calculateHydration({ ...profile, gender: 'male', sport: 'both' });

    expect(female.referenceTotalWaterMl).toBe(2000);
    expect(male.referenceTotalWaterMl).toBe(2500);
    expect(female.shouldConsiderElectrolytes).toBe(true);
    expect(male.shouldConsiderElectrolytes).toBe(true);
  });

  it('bounds implausibly low and high starting estimates', () => {
    expect(calculateHydration({ ...profile, weight: 20 }).dailyTargetMl).toBe(1500);
    expect(calculateHydration({ ...profile, weight: 200 }).dailyTargetMl).toBe(5000);
  });
});
