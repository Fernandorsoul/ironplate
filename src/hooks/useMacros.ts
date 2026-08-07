import { useMemo } from 'react';
import { Macros, DailyLog } from '../types';

interface MacroProgress {
  current: Macros;
  percentages: { calories: number; protein: number; carbs: number; fat: number };
  isOnTarget: boolean;
}

export function useMacros(targetMacros: Macros | null, todayLog: DailyLog | null): MacroProgress {
  return useMemo(() => {
    const current = todayLog?.totalMacros || { calories: 0, protein: 0, carbs: 0, fat: 0 };

    if (!targetMacros) {
      return {
        current,
        percentages: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        isOnTarget: false,
      };
    }

    const percentages = {
      calories: Math.round((current.calories / targetMacros.calories) * 100),
      protein: Math.round((current.protein / targetMacros.protein) * 100),
      carbs: Math.round((current.carbs / targetMacros.carbs) * 100),
      fat: Math.round((current.fat / targetMacros.fat) * 100),
    };

    const isOnTarget =
      percentages.calories >= 90 &&
      percentages.protein >= 90;

    return { current, percentages, isOnTarget };
  }, [targetMacros, todayLog]);
}
