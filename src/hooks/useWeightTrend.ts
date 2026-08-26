import { useMemo } from 'react';
import { WeightEntry } from '../types';

interface WeightTrend {
  last7Days: WeightEntry[];
  last30Days: WeightEntry[];
  trend: number | null;
  stats: { min: number; max: number; current: number } | null;
}

function getMinMax(arr: number[]): { min: number; max: number } {
  let min = arr[0];
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
    if (arr[i] > max) max = arr[i];
  }
  return { min, max };
}

export function useWeightTrend(weightHistory: WeightEntry[]): WeightTrend {
  return useMemo(() => {
    const last7Days = weightHistory.slice(-7);
    const last30Days = weightHistory.slice(-30);

    if (last7Days.length < 2) {
      return { last7Days, last30Days, trend: null, stats: null };
    }

    const first = last7Days[last7Days.length - 1].weight;
    const last = last7Days[0].weight;
    const trend = last - first;

    const weights = last30Days.map(e => e.weight);
    const { min, max } = getMinMax(weights);
    const stats = { min, max, current: last };

    return { last7Days, last30Days, trend, stats };
  }, [weightHistory]);
}
