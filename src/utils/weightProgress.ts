import type { Goal, UserProfile, WeightEntry } from '../types';

export type WeightDirection = 'lose' | 'gain' | 'maintain';

export interface WeightProgress {
  currentWeight: number;
  currentWeightSource: 'history' | 'profile' | 'unknown';
  targetWeightKg: number | null;
  differenceToTargetKg: number | null;
  progressPercent: number | null;
  reachedTarget: boolean;
  startingWeight: number | null;
  direction: WeightDirection;
}

function hasFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function getWeightDirection(goal?: Goal | null): WeightDirection {
  switch (goal) {
    case 'bulking':
      return 'gain';
    case 'weight_loss':
    case 'cutting_conservative':
    case 'cutting_preparation':
    case 'cutting_precontest':
      return 'lose';
    default:
      return 'maintain';
  }
}

export function getCurrentWeight(profile: UserProfile | null, weightHistory: WeightEntry[]): {
  weight: number;
  source: WeightProgress['currentWeightSource'];
} {
  const latestEntry = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (latestEntry && hasFinitePositive(latestEntry.weight)) {
    return { weight: latestEntry.weight, source: 'history' };
  }

  if (profile && hasFinitePositive(profile.weight)) {
    return { weight: profile.weight, source: 'profile' };
  }

  return { weight: 0, source: 'unknown' };
}

export function getWeightProgress(profile: UserProfile | null, weightHistory: WeightEntry[]): WeightProgress {
  const current = getCurrentWeight(profile, weightHistory);
  const targetWeightKg = profile && hasFinitePositive(profile.targetWeightKg) ? profile.targetWeightKg : null;
  const direction = getWeightDirection(profile?.goal);
  const startingWeight = weightHistory.length > 0 && hasFinitePositive(weightHistory[0].weight)
    ? weightHistory[0].weight
    : current.weight > 0
      ? current.weight
      : null;

  if (!targetWeightKg || !current.weight) {
    return {
      currentWeight: current.weight,
      currentWeightSource: current.source,
      targetWeightKg,
      differenceToTargetKg: null,
      progressPercent: null,
      reachedTarget: false,
      startingWeight,
      direction,
    };
  }

  const differenceToTargetKg = Number((current.weight - targetWeightKg).toFixed(2));
  const reachedTarget = direction === 'gain'
    ? current.weight >= targetWeightKg
    : direction === 'lose'
      ? current.weight <= targetWeightKg
      : Math.abs(differenceToTargetKg) <= 0.25;

  let progressPercent: number | null = null;
  if (startingWeight != null && startingWeight !== targetWeightKg) {
    if (direction === 'lose') {
      const denominator = startingWeight - targetWeightKg;
      progressPercent = denominator > 0
        ? Math.min(100, Math.max(0, ((startingWeight - current.weight) / denominator) * 100))
        : null;
    } else if (direction === 'gain') {
      const denominator = targetWeightKg - startingWeight;
      progressPercent = denominator > 0
        ? Math.min(100, Math.max(0, ((current.weight - startingWeight) / denominator) * 100))
        : null;
    } else {
      const denominator = Math.max(startingWeight, targetWeightKg);
      progressPercent = denominator > 0
        ? Math.min(100, Math.max(0, (1 - Math.abs(current.weight - targetWeightKg) / denominator) * 100))
        : null;
    }
  }

  return {
    currentWeight: current.weight,
    currentWeightSource: current.source,
    targetWeightKg,
    differenceToTargetKg,
    progressPercent,
    reachedTarget,
    startingWeight,
    direction,
  };
}
