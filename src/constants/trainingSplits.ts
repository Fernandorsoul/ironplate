import type { MuscleGroup, TrainingLevel, TrainingSplitId } from '../types';

export interface TrainingDayTemplate {
  id: string;
  label: string;
  shortLabel: string;
  muscleGroups: MuscleGroup[];
}

export interface TrainingSplitTemplate {
  id: TrainingSplitId;
  label: string;
  shortLabel: string;
  description: string;
  daysPerCycle: number;
  recommendedLevels: TrainingLevel[];
  days: TrainingDayTemplate[];
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Peito',
  back: 'Costas',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  hamstrings: 'Posteriores',
  glutes: 'Glúteos',
  calves: 'Panturrilhas',
  core: 'Core',
  forearms: 'Antebraços',
  full_body: 'Corpo inteiro',
};

export const TRAINING_SPLITS: TrainingSplitTemplate[] = [
  {
    id: 'full_body',
    label: 'Full body',
    shortLabel: 'Full body',
    description: 'Corpo inteiro na mesma sessão; organização simples para 2–3 dias por semana.',
    daysPerCycle: 1,
    recommendedLevels: ['beginner', 'intermediate'],
    days: [{ id: 'full_body', label: 'Full body', shortLabel: 'Corpo inteiro', muscleGroups: ['full_body'] }],
  },
  {
    id: 'upper_lower',
    label: 'AB — Superior / Inferior',
    shortLabel: 'AB',
    description: 'Alterna membros superiores e inferiores; funciona bem em 3–4 dias por semana.',
    daysPerCycle: 2,
    recommendedLevels: ['beginner', 'intermediate', 'advanced'],
    days: [
      { id: 'upper', label: 'A — Membros superiores', shortLabel: 'Superior', muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
      { id: 'lower', label: 'B — Membros inferiores', shortLabel: 'Inferior', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'core'] },
    ],
  },
  {
    id: 'abc_classic',
    label: 'ABC clássico',
    shortLabel: 'ABC',
    description: 'Agrupa músculos sinergistas em três sessões.',
    daysPerCycle: 3,
    recommendedLevels: ['intermediate', 'advanced'],
    days: [
      { id: 'chest_triceps', label: 'A — Peito e tríceps', shortLabel: 'Peito + tríceps', muscleGroups: ['chest', 'triceps'] },
      { id: 'back_biceps', label: 'B — Costas e bíceps', shortLabel: 'Costas + bíceps', muscleGroups: ['back', 'biceps', 'forearms'] },
      { id: 'legs_shoulders', label: 'C — Pernas e ombros', shortLabel: 'Pernas + ombros', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'shoulders', 'core'] },
    ],
  },
  {
    id: 'abc_antagonist',
    label: 'ABC antagonista',
    shortLabel: 'ABC antag.',
    description: 'Combina peito com bíceps e costas com tríceps, como alternativa de preferência pessoal.',
    daysPerCycle: 3,
    recommendedLevels: ['intermediate', 'advanced'],
    days: [
      { id: 'chest_biceps', label: 'A — Peito e bíceps', shortLabel: 'Peito + bíceps', muscleGroups: ['chest', 'biceps'] },
      { id: 'back_triceps', label: 'B — Costas e tríceps', shortLabel: 'Costas + tríceps', muscleGroups: ['back', 'triceps', 'forearms'] },
      { id: 'legs_shoulders', label: 'C — Pernas e ombros', shortLabel: 'Pernas + ombros', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'shoulders', 'core'] },
    ],
  },
  {
    id: 'push_pull_legs',
    label: 'Push / Pull / Legs',
    shortLabel: 'PPL',
    description: 'Divide movimentos de empurrar, puxar e membros inferiores.',
    daysPerCycle: 3,
    recommendedLevels: ['intermediate', 'advanced'],
    days: [
      { id: 'push', label: 'Push — Empurrar', shortLabel: 'Push', muscleGroups: ['chest', 'shoulders', 'triceps'] },
      { id: 'pull', label: 'Pull — Puxar', shortLabel: 'Pull', muscleGroups: ['back', 'biceps', 'forearms'] },
      { id: 'legs', label: 'Legs — Pernas', shortLabel: 'Legs', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'core'] },
    ],
  },
  {
    id: 'abcd',
    label: 'ABCD',
    shortLabel: 'ABCD',
    description: 'Quatro sessões para distribuir mais volume por grupo muscular.',
    daysPerCycle: 4,
    recommendedLevels: ['intermediate', 'advanced'],
    days: [
      { id: 'chest_triceps', label: 'A — Peito e tríceps', shortLabel: 'Peito + tríceps', muscleGroups: ['chest', 'triceps'] },
      { id: 'back_biceps', label: 'B — Costas e bíceps', shortLabel: 'Costas + bíceps', muscleGroups: ['back', 'biceps', 'forearms'] },
      { id: 'legs', label: 'C — Pernas', shortLabel: 'Pernas', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
      { id: 'shoulders_core', label: 'D — Ombros e core', shortLabel: 'Ombros + core', muscleGroups: ['shoulders', 'core'] },
    ],
  },
  {
    id: 'abcde',
    label: 'ABCDE',
    shortLabel: 'ABCDE',
    description: 'Cinco sessões especializadas; exige maior disponibilidade e recuperação.',
    daysPerCycle: 5,
    recommendedLevels: ['advanced'],
    days: [
      { id: 'chest', label: 'A — Peito', shortLabel: 'Peito', muscleGroups: ['chest'] },
      { id: 'back', label: 'B — Costas', shortLabel: 'Costas', muscleGroups: ['back', 'forearms'] },
      { id: 'legs', label: 'C — Pernas', shortLabel: 'Pernas', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
      { id: 'shoulders', label: 'D — Ombros e core', shortLabel: 'Ombros', muscleGroups: ['shoulders', 'core'] },
      { id: 'arms', label: 'E — Braços', shortLabel: 'Braços', muscleGroups: ['biceps', 'triceps', 'forearms'] },
    ],
  },
  {
    id: 'custom',
    label: 'Personalizado',
    shortLabel: 'Personalizado',
    description: 'Nome e organização livres para rotinas já definidas com um profissional.',
    daysPerCycle: 1,
    recommendedLevels: ['beginner', 'intermediate', 'advanced'],
    days: [{ id: 'custom', label: 'Treino personalizado', shortLabel: 'Personalizado', muscleGroups: [] }],
  },
];

export function getTrainingSplit(splitId: TrainingSplitId): TrainingSplitTemplate {
  return TRAINING_SPLITS.find(split => split.id === splitId) || TRAINING_SPLITS[0];
}

export function getRecommendedTrainingSplits(level: TrainingLevel, availableDays: number): TrainingSplitTemplate[] {
  return TRAINING_SPLITS.filter(split => {
    if (split.id === 'custom') return false;
    const levelMatches = split.recommendedLevels.includes(level);
    const daysMatch = split.daysPerCycle <= Math.max(availableDays, 1);
    return levelMatches && daysMatch;
  });
}

