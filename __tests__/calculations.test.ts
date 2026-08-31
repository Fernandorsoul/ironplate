import {
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
  calculatePortionMacros,
  sumMacros,
  getMacroPercentages,
  calculateWorkoutCalories,
  calculateDailyEnergyExpenditure,
  formatNutritionValue,
  roundNutritionValue,
} from '../src/utils/calculations';
import { UserProfile } from '../src/types';

// Test profiles
const maleProfile: UserProfile = {
  name: 'João',
  age: 25,
  weight: 80,
  height: 180,
  gender: 'male',
  activityLevel: 'moderate',
  goal: 'maintenance',
  sport: 'bodybuilding',
};

const femaleProfile: UserProfile = {
  name: 'Maria',
  age: 30,
  weight: 60,
  height: 165,
  gender: 'female',
  activityLevel: 'light',
  goal: 'cutting',
  sport: 'bjj',
};

describe('Nutrition Calculations', () => {
  describe('calculateBMR', () => {
    it('calculates BMR for male using Mifflin-St Jeor', () => {
      // 10 * 80 + 6.25 * 180 - 5 * 25 + 5 = 800 + 1125 - 125 + 5 = 1805
      expect(calculateBMR(maleProfile)).toBe(1805);
    });

    it('calculates BMR for female using Mifflin-St Jeor', () => {
      // 10 * 60 + 6.25 * 165 - 5 * 30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
      expect(calculateBMR(femaleProfile)).toBeCloseTo(1320.25);
    });

    it('returns different BMR for different genders with same stats', () => {
      const maleStats = { ...maleProfile, gender: 'male' as const };
      const femaleStats = { ...maleProfile, gender: 'female' as const };
      expect(calculateBMR(maleStats)).toBeGreaterThan(calculateBMR(femaleStats));
    });
  });

  describe('calculateTDEE', () => {
    it('calculates TDEE with moderate activity (1.55 multiplier)', () => {
      const bmr = calculateBMR(maleProfile);
      const expected = Math.round(bmr * 1.55);
      expect(calculateTDEE(maleProfile)).toBe(expected);
    });

    it('calculates TDEE with light activity (1.375 multiplier)', () => {
      const bmr = calculateBMR(femaleProfile);
      const expected = Math.round(bmr * 1.375);
      expect(calculateTDEE(femaleProfile)).toBe(expected);
    });

    it('returns higher TDEE for more active profiles', () => {
      const sedentary = { ...maleProfile, activityLevel: 'sedentary' as const };
      const veryActive = { ...maleProfile, activityLevel: 'very_active' as const };
      expect(calculateTDEE(veryActive)).toBeGreaterThan(calculateTDEE(sedentary));
    });
  });

  describe('workout energy expenditure', () => {
    it('uses workout type, duration, intensity and body weight', () => {
      const strength = { id: '1', name: 'Força', type: 'strength' as const, duration: 60, intensity: 'medium' as const };
      const bjj = { ...strength, id: '2', type: 'bjj' as const };
      expect(calculateWorkoutCalories(strength, 80)).toBe(504);
      expect(calculateWorkoutCalories(bjj, 80)).toBe(865);
    });

    it('adds workout calories to a sedentary daily baseline', () => {
      const workout = { id: '1', name: 'Cardio', type: 'cardio' as const, duration: 30, intensity: 'high' as const };
      const result = calculateDailyEnergyExpenditure(maleProfile, [workout]);
      expect(result.baseExpenditure).toBe(Math.round(calculateBMR(maleProfile) * 1.2));
      expect(result.workoutExpenditure).toBe(calculateWorkoutCalories(workout, maleProfile.weight));
      expect(result.totalExpenditure).toBe(result.baseExpenditure + result.workoutExpenditure);
    });
  });

  describe('calculateTargetCalories', () => {
    it('returns TDEE for maintenance', () => {
      const maintenance = { ...maleProfile, goal: 'maintenance' as const };
      expect(calculateTargetCalories(maintenance)).toBe(calculateTDEE(maintenance));
    });

    it('returns TDEE + 15% for bulking', () => {
      const bulking = { ...maleProfile, goal: 'bulking' as const };
      const tdee = calculateTDEE(bulking);
      expect(calculateTargetCalories(bulking)).toBe(Math.round(tdee * 1.15));
    });

    it('returns TDEE - 15% for cutting conservative', () => {
      const cutting = { ...maleProfile, goal: 'cutting_conservative' as const };
      const tdee = calculateTDEE(cutting);
      expect(calculateTargetCalories(cutting)).toBe(Math.round(tdee * 0.85));
    });

    it('returns TDEE - 20% for cutting preparation', () => {
      const cutting = { ...maleProfile, goal: 'cutting_preparation' as const };
      const tdee = calculateTDEE(cutting);
      expect(calculateTargetCalories(cutting)).toBe(Math.round(tdee * 0.80));
    });

    it('returns TDEE - 25% for cutting precontest', () => {
      const cutting = { ...maleProfile, goal: 'cutting_precontest' as const };
      const tdee = calculateTDEE(cutting);
      expect(calculateTargetCalories(cutting)).toBe(Math.round(tdee * 0.75));
    });
  });

  describe('calculateMacros', () => {
    it('calculates macros for bodybuilding maintenance (1.8g/kg protein)', () => {
      const macros = calculateMacros(maleProfile);
      // Protein: 80kg * 1.8 = 144g (maintenance for bodybuilding)
      expect(macros.protein).toBe(144);
    });

    it('calculates macros for BJJ maintenance (1.6g/kg protein)', () => {
      const bjjProfile = { ...maleProfile, sport: 'bjj' as const };
      const macros = calculateMacros(bjjProfile);
      // Protein: 80kg * 1.6 = 128g (maintenance for BJJ)
      expect(macros.protein).toBe(128);
    });

    it('allocates 25% of calories to fat for maintenance', () => {
      const macros = calculateMacros(maleProfile);
      const fatCalories = macros.fat * 9;
      const totalCalories = macros.calories;
      const fatPercentage = fatCalories / totalCalories;
      expect(fatPercentage).toBeCloseTo(0.25, 1);
    });

    it('ensures protein + carbs + fat calories roughly equal total', () => {
      const macros = calculateMacros(maleProfile);
      const calculatedCalories = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
      expect(Math.abs(calculatedCalories - macros.calories)).toBeLessThan(10);
    });

    it('returns positive values for all macros', () => {
      const macros = calculateMacros(maleProfile);
      expect(macros.calories).toBeGreaterThan(0);
      expect(macros.protein).toBeGreaterThan(0);
      expect(macros.carbs).toBeGreaterThan(0);
      expect(macros.fat).toBeGreaterThan(0);
    });

    it('preserves protein and carbohydrate floors when calories are restricted', () => {
      const highWeightPreContest: UserProfile = {
        ...maleProfile,
        age: 40,
        weight: 120,
        height: 170,
        activityLevel: 'sedentary',
        goal: 'cutting_precontest',
      };

      const macros = calculateMacros(highWeightPreContest);

      expect(macros.protein / highWeightPreContest.weight).toBeGreaterThanOrEqual(1.6);
      expect(macros.carbs / highWeightPreContest.weight).toBeGreaterThanOrEqual(1.5);
      expect(macros.carbs).toBeGreaterThan(0);
      expect(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9).toBeCloseTo(macros.calories, 0);
    });
  });

  describe('calculatePortionMacros', () => {
    const food = {
      macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    };

    it('calculates macros for 100g (same as base)', () => {
      const portion = calculatePortionMacros(food, 100);
      expect(portion.calories).toBe(165);
      expect(portion.protein).toBe(31);
    });

    it('calculates macros for 200g (double)', () => {
      const portion = calculatePortionMacros(food, 200);
      expect(portion.calories).toBe(330);
      expect(portion.protein).toBe(62);
    });

    it('calculates macros for 50g (half)', () => {
      const portion = calculatePortionMacros(food, 50);
      expect(portion.calories).toBe(82.5);
      expect(portion.protein).toBe(15.5);
    });

    it('returns zero for 0g portion', () => {
      const portion = calculatePortionMacros(food, 0);
      expect(portion.calories).toBe(0);
      expect(portion.protein).toBe(0);
    });
  });

  describe('sumMacros', () => {
    it('sums multiple macro objects', () => {
      const macros1 = { calories: 100, protein: 20, carbs: 10, fat: 5 };
      const macros2 = { calories: 200, protein: 30, carbs: 20, fat: 10 };
      const result = sumMacros([macros1, macros2]);
      expect(result).toEqual({ calories: 300, protein: 50, carbs: 30, fat: 15 });
    });

    it('returns zeros for empty array', () => {
      expect(sumMacros([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it('handles single item array', () => {
      const macros = { calories: 150, protein: 25, carbs: 15, fat: 8 };
      expect(sumMacros([macros])).toEqual(macros);
    });
  });

  describe('nutrition value precision', () => {
    it('rounds values to at most three decimal places', () => {
      expect(roundNutritionValue(0.1 + 0.2)).toBe(0.3);
      expect(roundNutritionValue(12.34567)).toBe(12.346);
    });

    it('formats decimal values with a comma and without unnecessary zeros', () => {
      expect(formatNutritionValue(12)).toBe('12');
      expect(formatNutritionValue(12.3)).toBe('12,3');
      expect(formatNutritionValue(12.34567)).toBe('12,346');
      expect(formatNutritionValue(Number.NaN)).toBe('0');
    });
  });

  describe('getMacroPercentages', () => {
    it('calculates correct percentages', () => {
      // P: 100g * 4 = 400 cal, C: 200g * 4 = 800 cal, F: 50g * 9 = 450 cal
      // Total = 1650 cal
      const macros = { calories: 1650, protein: 100, carbs: 200, fat: 50 };
      const percentages = getMacroPercentages(macros);
      expect(percentages.protein).toBe(24); // 400/1650 ≈ 24%
      expect(percentages.carbs).toBe(48);   // 800/1650 ≈ 48%
      expect(percentages.fat).toBe(27);     // 450/1650 ≈ 27%
    });

    it('returns zeros when all macros are zero', () => {
      const macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      expect(getMacroPercentages(macros)).toEqual({ protein: 0, carbs: 0, fat: 0 });
    });

    it('percentages roughly sum to 100', () => {
      const macros = { calories: 2000, protein: 150, carbs: 250, fat: 55 };
      const percentages = getMacroPercentages(macros);
      const sum = percentages.protein + percentages.carbs + percentages.fat;
      expect(sum).toBeGreaterThanOrEqual(99);
      expect(sum).toBeLessThanOrEqual(101);
    });
  });
});
