import {
  getRecommendedTrainingSplits,
  getTrainingSplit,
  MUSCLE_GROUP_LABELS,
  TRAINING_SPLITS,
} from '../src/constants/trainingSplits';

describe('training split templates', () => {
  it('contains all planned split families', () => {
    expect(TRAINING_SPLITS.map(split => split.id)).toEqual([
      'full_body',
      'upper_lower',
      'abc_classic',
      'abc_antagonist',
      'push_pull_legs',
      'abcd',
      'abcde',
      'custom',
    ]);
  });

  it('contains the requested chest/biceps and back/triceps sessions', () => {
    const split = getTrainingSplit('abc_antagonist');

    expect(split.days.find(day => day.id === 'chest_biceps')?.muscleGroups).toEqual(['chest', 'biceps']);
    expect(split.days.find(day => day.id === 'back_triceps')?.muscleGroups).toEqual(['back', 'triceps', 'forearms']);
  });

  it('keeps every day identifier unique inside its split', () => {
    for (const split of TRAINING_SPLITS) {
      const ids = split.days.map(day => day.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('recommends simple templates for beginners and reserves ABCDE for advanced users', () => {
    const beginner = getRecommendedTrainingSplits('beginner', 3).map(split => split.id);
    const advanced = getRecommendedTrainingSplits('advanced', 5).map(split => split.id);

    expect(beginner).toContain('full_body');
    expect(beginner).not.toContain('abcde');
    expect(advanced).toContain('abcde');
  });

  it('has a display label for every muscle group used by templates', () => {
    const groups = TRAINING_SPLITS.flatMap(split => split.days.flatMap(day => day.muscleGroups));
    expect(groups.every(group => Boolean(MUSCLE_GROUP_LABELS[group]))).toBe(true);
  });
});

