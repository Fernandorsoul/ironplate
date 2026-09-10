import { getWeightProgress } from '../src/utils/weightProgress';
import { UserProfile } from '../src/types';

const profile: UserProfile = {
  name: 'Atleta',
  age: 30,
  weight: 90,
  height: 180,
  gender: 'male',
  activityLevel: 'moderate',
  goal: 'weight_loss',
  sport: 'walking',
  targetWeightKg: 80,
};

describe('weight progress', () => {
  it('uses the latest history entry and calculates loss progress', () => {
    const result = getWeightProgress(profile, [
      { date: '2026-01-01', weight: 90 },
      { date: '2026-02-01', weight: 85 },
    ]);

    expect(result.currentWeight).toBe(85);
    expect(result.differenceToTargetKg).toBe(5);
    expect(result.progressPercent).toBe(50);
    expect(result.direction).toBe('lose');
  });

  it('marks a target as reached when the loss goal is met', () => {
    const result = getWeightProgress(profile, [{ date: '2026-02-01', weight: 79.8 }]);
    expect(result.reachedTarget).toBe(true);
  });
});
