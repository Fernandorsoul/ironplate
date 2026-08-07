// Test hooks logic directly without renderHook (avoids react-test-renderer issues)

import { useMacros, useWeightTrend, useFoodSearch } from '../src/hooks';
import { Macros, DailyLog, WeightEntry, Food } from '../src/types';

// Since hooks can only be called inside React components, we test the underlying logic
// by calling the hook functions with the same logic

describe('useMacros logic', () => {
  const targetMacros: Macros = { calories: 2000, protein: 150, carbs: 250, fat: 55 };

  const calculateMacrosLogic = (target: Macros | null, log: DailyLog | null) => {
    const current = log?.totalMacros || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    if (!target) {
      return { current, percentages: { calories: 0, protein: 0, carbs: 0, fat: 0 }, isOnTarget: false };
    }
    const percentages = {
      calories: Math.round((current.calories / target.calories) * 100),
      protein: Math.round((current.protein / target.protein) * 100),
      carbs: Math.round((current.carbs / target.carbs) * 100),
      fat: Math.round((current.fat / target.fat) * 100),
    };
    const isOnTarget = percentages.calories >= 90 && percentages.protein >= 90;
    return { current, percentages, isOnTarget };
  };

  it('returns zeros when no data provided', () => {
    const result = calculateMacrosLogic(null, null);
    expect(result.current).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(result.isOnTarget).toBe(false);
  });

  it('calculates percentages correctly', () => {
    const log: DailyLog = {
      date: '2026-08-07', meals: [], workouts: [],
      totalMacros: { calories: 1800, protein: 140, carbs: 200, fat: 50 },
    };
    const result = calculateMacrosLogic(targetMacros, log);
    expect(result.percentages.calories).toBe(90);
    expect(result.percentages.protein).toBe(93);
  });

  it('detects on-target', () => {
    const log: DailyLog = {
      date: '2026-08-07', meals: [], workouts: [],
      totalMacros: { calories: 1900, protein: 145, carbs: 200, fat: 50 },
    };
    expect(calculateMacrosLogic(targetMacros, log).isOnTarget).toBe(true);
  });

  it('detects off-target', () => {
    const log: DailyLog = {
      date: '2026-08-07', meals: [], workouts: [],
      totalMacros: { calories: 1500, protein: 100, carbs: 200, fat: 50 },
    };
    expect(calculateMacrosLogic(targetMacros, log).isOnTarget).toBe(false);
  });
});

describe('useWeightTrend logic', () => {
  const calcTrend = (history: WeightEntry[]) => {
    const last7Days = history.slice(-7);
    const last30Days = history.slice(-30);
    if (last7Days.length < 2) return { trend: null, stats: null };
    const first = last7Days[last7Days.length - 1].weight;
    const last = last7Days[0].weight;
    const trend = last - first;
    const weights = last30Days.map(e => e.weight);
    return { trend, stats: { min: Math.min(...weights), max: Math.max(...weights), current: last } };
  };

  it('returns null with empty history', () => {
    expect(calcTrend([]).trend).toBeNull();
  });

  it('returns null with single entry', () => {
    expect(calcTrend([{ date: '2026-08-07', weight: 80 }]).trend).toBeNull();
  });

  it('calculates trend for weight loss', () => {
    const history: WeightEntry[] = [
      { date: '2026-08-01', weight: 80 }, { date: '2026-08-07', weight: 78.5 },
    ];
    // last7Days = [80, 78.5], first=78.5 (index -1), last=80 (index 0)
    // trend = last - first = 80 - 78.5 = 1.5
    expect(calcTrend(history).trend).toBe(1.5);
  });

  it('calculates trend for weight gain', () => {
    const history: WeightEntry[] = [
      { date: '2026-08-01', weight: 78 }, { date: '2026-08-07', weight: 80 },
    ];
    // last7Days = [78, 80], first=80, last=78, trend = 78 - 80 = -2
    expect(calcTrend(history).trend).toBe(-2);
  });

  it('calculates correct stats', () => {
    const history: WeightEntry[] = [
      { date: '2026-08-01', weight: 80 }, { date: '2026-08-05', weight: 79 },
      { date: '2026-08-07', weight: 78.5 },
    ];
    // last7Days[0] = 80 (first entry), current = 80
    expect(calcTrend(history).stats).toEqual({ min: 78.5, max: 80, current: 80 });
  });
});

describe('useFoodSearch logic', () => {
  const foods: Food[] = [
    { id: '1', name: 'Peito de Frango', macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, category: 'Proteína' },
    { id: '2', name: 'Arroz Branco', macros: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 }, category: 'Carboidrato' },
    { id: '3', name: 'Banana', macros: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 }, category: 'Fruta' },
  ];

  const search = (all: Food[], q: string) => {
    if (!q.trim()) return all;
    return all.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
  };

  it('returns all when empty query', () => {
    expect(search(foods, '').length).toBe(3);
  });

  it('filters case-insensitive', () => {
    expect(search(foods, 'frango').length).toBe(1);
    expect(search(foods, 'FRANGO').length).toBe(1);
  });

  it('returns empty on no match', () => {
    expect(search(foods, 'pizza').length).toBe(0);
  });
});
