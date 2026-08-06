// Common foods database for IronPlate

import { Food } from '../types';

export const FOOD_DATABASE: Food[] = [
  // Proteins
  { id: 'chicken_breast', name: 'Peito de Frango', macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, category: 'Proteína' },
  { id: 'rice', name: 'Arroz Branco', macros: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 }, category: 'Carboidrato' },
  { id: 'beans', name: 'Feijão Carioca', macros: { calories: 127, protein: 8.7, carbs: 22, fat: 0.5 }, category: 'Proteína' },
  { id: 'egg', name: 'Ovo', macros: { calories: 155, protein: 13, carbs: 1.1, fat: 11 }, category: 'Proteína' },
  { id: 'banana', name: 'Banana', macros: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 }, category: 'Fruta' },
  { id: 'oats', name: 'Aveia', macros: { calories: 389, protein: 17, carbs: 66, fat: 7 }, category: 'Carboidrato' },
  { id: 'sweet_potato', name: 'Batata Doce', macros: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 }, category: 'Carboidrato' },
  { id: 'beef', name: 'Carne Bovina', macros: { calories: 250, protein: 26, carbs: 0, fat: 15 }, category: 'Proteína' },
  { id: 'tuna', name: 'Atum', macros: { calories: 130, protein: 29, carbs: 0, fat: 1 }, category: 'Proteína' },
  { id: 'whey', name: 'Whey Protein', macros: { calories: 120, protein: 24, carbs: 3, fat: 1.5 }, category: 'Proteína' },
  { id: 'broccoli', name: 'Brócolis', macros: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 }, category: 'Verdura' },
  { id: 'olive_oil', name: 'Azeite de Oliva', macros: { calories: 884, protein: 0, carbs: 0, fat: 100 }, category: 'Gordura' },
  { id: 'avocado', name: 'Abacate', macros: { calories: 160, protein: 2, carbs: 9, fat: 15 }, category: 'Gordura' },
  { id: 'greek_yogurt', name: 'Iogurte Grego', macros: { calories: 97, protein: 9, carbs: 3.6, fat: 5 }, category: 'Proteína' },
  { id: 'bread', name: 'Pão Integral', macros: { calories: 247, protein: 13, carbs: 41, fat: 3.4 }, category: 'Carboidrato' },
  { id: 'milk', name: 'Leite Integral', macros: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 }, category: 'Proteína' },
  { id: 'pasta', name: 'Macarrão', macros: { calories: 131, protein: 5, carbs: 25, fat: 1.1 }, category: 'Carboidrato' },
  { id: 'peanut_butter', name: 'Pasta de Amendoim', macros: { calories: 588, protein: 25, carbs: 20, fat: 50 }, category: 'Gordura' },
  { id: 'almonds', name: 'Amêndoas', macros: { calories: 579, protein: 21, carbs: 22, fat: 50 }, category: 'Gordura' },
  { id: 'salmon', name: 'Salmão', macros: { calories: 208, protein: 20, carbs: 0, fat: 13 }, category: 'Proteína' },
];

export const MEAL_TIMING_LABELS: Record<string, string> = {
  pre_workout: 'Pré-treino',
  post_workout: 'Pós-treino',
  regular: 'Refeição livre',
};

export const ACTIVITY_LEVELS: Record<string, { label: string; multiplier: number }> = {
  sedentary: { label: 'Sedentário', multiplier: 1.2 },
  light: { label: 'Levemente ativo', multiplier: 1.375 },
  moderate: { label: 'Moderadamente ativo', multiplier: 1.55 },
  active: { label: 'Muito ativo', multiplier: 1.725 },
  very_active: { label: 'Extremamente ativo', multiplier: 1.9 },
};
