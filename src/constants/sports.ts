import type { Sport, WorkoutType } from '../types';

export interface SportOption {
  id: Sport;
  label: string;
  shortLabel: string;
  icon: string;
  category: 'strength' | 'combat' | 'endurance' | 'team' | 'mixed' | 'other';
}

export interface WorkoutTypeOption {
  id: WorkoutType;
  label: string;
  icon: string;
  description: string;
}

export const SPORT_OPTIONS: SportOption[] = [
  { id: 'bodybuilding', label: 'Musculação / Bodybuilding', shortLabel: 'Musculação', icon: '🏋️', category: 'strength' },
  { id: 'bjj', label: 'BJJ / Artes marciais', shortLabel: 'BJJ', icon: '🥋', category: 'combat' },
  { id: 'both', label: 'Musculação + BJJ', shortLabel: 'Musculação + BJJ', icon: '🥋', category: 'mixed' },
  { id: 'running', label: 'Corrida', shortLabel: 'Corrida', icon: '🏃', category: 'endurance' },
  { id: 'cycling', label: 'Ciclismo', shortLabel: 'Ciclismo', icon: '🚴', category: 'endurance' },
  { id: 'swimming', label: 'Natação', shortLabel: 'Natação', icon: '🏊', category: 'endurance' },
  { id: 'soccer', label: 'Futebol', shortLabel: 'Futebol', icon: '⚽', category: 'team' },
  { id: 'functional', label: 'Cross training / Funcional', shortLabel: 'Funcional', icon: '⚡', category: 'mixed' },
  { id: 'calisthenics', label: 'Calistenia', shortLabel: 'Calistenia', icon: '🤸', category: 'strength' },
  { id: 'walking', label: 'Caminhada', shortLabel: 'Caminhada', icon: '🚶', category: 'endurance' },
  { id: 'hybrid', label: 'Híbrido / Multiesporte', shortLabel: 'Híbrido', icon: '🔀', category: 'mixed' },
  { id: 'other', label: 'Outra modalidade', shortLabel: 'Outra', icon: '➕', category: 'other' },
];

export const WORKOUT_TYPE_OPTIONS: WorkoutTypeOption[] = [
  { id: 'strength', label: 'Musculação', icon: '🏋️', description: 'Força e hipertrofia com pesos, máquinas ou elásticos.' },
  { id: 'bjj', label: 'BJJ / Luta', icon: '🥋', description: 'Treino técnico, rolas ou preparação para artes marciais.' },
  { id: 'running', label: 'Corrida', icon: '🏃', description: 'Corrida contínua, intervalada ou treino de ritmo.' },
  { id: 'cycling', label: 'Ciclismo', icon: '🚴', description: 'Pedal ao ar livre ou bicicleta ergométrica.' },
  { id: 'swimming', label: 'Natação', icon: '🏊', description: 'Treino contínuo, técnico ou intervalado na água.' },
  { id: 'soccer', label: 'Futebol', icon: '⚽', description: 'Treino técnico, coletivo ou partida.' },
  { id: 'functional', label: 'Funcional', icon: '⚡', description: 'Circuitos, cross training e condicionamento misto.' },
  { id: 'calisthenics', label: 'Calistenia', icon: '🤸', description: 'Força e habilidade usando principalmente o peso corporal.' },
  { id: 'walking', label: 'Caminhada', icon: '🚶', description: 'Caminhada leve, moderada ou acelerada.' },
  { id: 'cardio', label: 'Outro cardio', icon: '❤️', description: 'Elíptico, escada, remo ou outra atividade aeróbia.' },
  { id: 'other', label: 'Outro', icon: '➕', description: 'Uma sessão que não se encaixa nas opções anteriores.' },
  { id: 'rest', label: 'Descanso', icon: '😴', description: 'Dia de recuperação sem treino estruturado.' },
];

export function getSportOption(sport: Sport): SportOption {
  return SPORT_OPTIONS.find(option => option.id === sport) || SPORT_OPTIONS[SPORT_OPTIONS.length - 1];
}

export function getWorkoutTypeOption(type: WorkoutType): WorkoutTypeOption {
  return WORKOUT_TYPE_OPTIONS.find(option => option.id === type) || WORKOUT_TYPE_OPTIONS[WORKOUT_TYPE_OPTIONS.length - 2];
}

export function isStrengthFocusedSport(sport: Sport): boolean {
  return sport === 'bodybuilding' || sport === 'calisthenics' || sport === 'functional' || sport === 'both' || sport === 'hybrid';
}

export function isCombatSport(sport: Sport): boolean {
  return sport === 'bjj' || sport === 'both';
}

