import { useMemo } from 'react';
import { WeightEntry } from '../types';

interface WeightTrend {
  last7Days: WeightEntry[];
  last30Days: WeightEntry[];
  trend: number | null;
  stats: { min: number; max: number; current: number } | null;
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
    const stats = {
      min: Math.min(...weights),
      max: Math.max(...weights),
      current: last,
    };

    return { last7Days, last30Days, trend, stats };
  }, [weightHistory]);
}
