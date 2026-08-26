// Common foods database for IronPlate
// Uses TACO table (UNICAMP) as primary source

export { TACO_DATABASE as FOOD_DATABASE } from './taco';

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
