import type { Goal } from '../types';

export interface GoalCopy {
  label: string;
  shortLabel: string;
  description: string;
  section: 'gain' | 'loss' | 'maintenance';
}

export const GOAL_COPY: Record<Goal, GoalCopy> = {
  bulking: {
    label: 'Bulking',
    shortLabel: 'Bulking',
    description: 'Superávit controlado para ganho de massa muscular',
    section: 'gain',
  },
  weight_loss: {
    label: 'Emagrecimento',
    shortLabel: 'Emagrecimento',
    description: 'Perda gradual com foco em saciedade e massa magra',
    section: 'loss',
  },
  cutting_conservative: {
    label: 'Cutting Conservador',
    shortLabel: 'Conservador',
    description: 'Déficit leve para perda gradual em fase off-season',
    section: 'loss',
  },
  cutting_preparation: {
    label: 'Preparação',
    shortLabel: 'Preparação',
    description: 'Déficit moderado para fase de preparação',
    section: 'loss',
  },
  cutting_precontest: {
    label: 'Pré-Competição',
    shortLabel: 'Pré-Competição',
    description: 'Déficit mais agressivo para fase final de competição',
    section: 'loss',
  },
  maintenance: {
    label: 'Manutenção',
    shortLabel: 'Manutenção',
    description: 'Manter o peso e a composição corporal',
    section: 'maintenance',
  },
};

export const GOAL_SECTIONS = [
  {
    key: 'gain' as const,
    title: 'Ganho de Massa',
    goals: ['bulking' as Goal],
  },
  {
    key: 'loss' as const,
    title: 'Perda de Peso',
    goals: ['weight_loss' as Goal, 'cutting_conservative' as Goal, 'cutting_preparation' as Goal, 'cutting_precontest' as Goal],
  },
  {
    key: 'maintenance' as const,
    title: 'Manutenção',
    goals: ['maintenance' as Goal],
  },
];

export function getGoalLabel(goal: Goal): string {
  return GOAL_COPY[goal].label;
}

export function getGoalShortLabel(goal: Goal): string {
  return GOAL_COPY[goal].shortLabel;
}

export function getGoalDescription(goal: Goal): string {
  return GOAL_COPY[goal].description;
}

export function getGoalSectionTitle(goal: Goal): string {
  return GOAL_SECTIONS.find(section => section.goals.includes(goal))?.title ?? 'Objetivo';
}
