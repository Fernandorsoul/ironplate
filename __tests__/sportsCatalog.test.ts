import { isPhoneLayout } from '../src/constants/layout';
import { SPORT_OPTIONS, WORKOUT_TYPE_OPTIONS } from '../src/constants/sports';
import { calculateWorkoutCalories } from '../src/utils/calculations';

describe('sports and workout catalog', () => {
  it('keeps identifiers unique and legacy profile modalities available', () => {
    const sportIds = SPORT_OPTIONS.map(option => option.id);
    const workoutIds = WORKOUT_TYPE_OPTIONS.map(option => option.id);

    expect(new Set(sportIds).size).toBe(sportIds.length);
    expect(new Set(workoutIds).size).toBe(workoutIds.length);
    expect(sportIds).toEqual(expect.arrayContaining(['bodybuilding', 'bjj', 'both']));
    expect(sportIds).toEqual(expect.arrayContaining(['running', 'cycling', 'swimming', 'soccer', 'functional', 'calisthenics']));
  });

  it('calculates a positive energy estimate for every active workout type', () => {
    for (const option of WORKOUT_TYPE_OPTIONS.filter(item => item.id !== 'rest')) {
      const calories = calculateWorkoutCalories({
        id: option.id,
        name: option.label,
        type: option.id,
        duration: 45,
        intensity: 'medium',
      }, 75);
      expect(calories).toBeGreaterThan(0);
    }
  });

  it.each([320, 360, 390, 430])('uses phone navigation at %ipx', width => {
    expect(isPhoneLayout(width)).toBe(true);
  });

  it('uses the lateral navigation on larger screens', () => {
    expect(isPhoneLayout(768)).toBe(false);
    expect(isPhoneLayout(1024)).toBe(false);
  });
});

