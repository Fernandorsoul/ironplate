// IronPlate Types

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type UserRole = 'student' | 'professional' | 'admin';
export type Goal =
  | 'bulking'
  | 'weight_loss'
  | 'cutting_conservative'
  | 'cutting_preparation'
  | 'cutting_precontest'
  | 'maintenance';
export type Sport =
  | 'bodybuilding'
  | 'bjj'
  | 'both'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'soccer'
  | 'functional'
  | 'calisthenics'
  | 'walking'
  | 'hybrid'
  | 'other';
export type MealTiming = 'pre_workout' | 'post_workout' | 'regular';
export type WorkoutType =
  | 'strength'
  | 'bjj'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'soccer'
  | 'functional'
  | 'calisthenics'
  | 'walking'
  | 'cardio'
  | 'rest'
  | 'other';
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'full_body';
export type TrainingSplitId =
  | 'full_body'
  | 'upper_lower'
  | 'abc_classic'
  | 'abc_antagonist'
  | 'push_pull_legs'
  | 'abcd'
  | 'abcde'
  | 'custom';

export interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  birthDate?: string; // YYYY-MM-DD
  photoUri?: string;
  targetWeightKg?: number;
  hydrationGoalMl?: number;
  role?: UserRole;
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: 'male' | 'female';
  activityLevel: ActivityLevel;
  goal: Goal;
  sport: Sport;
}

export interface Macros {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams;
}

export interface FoodPortionDef {
  unit: 'unidade' | 'fatia' | 'colher' | 'xicara' | 'ml' | 'g' | 'dente';
  gramsPerUnit: number;
  label?: string; // e.g., "1 ovo (~50g)"
}

export interface Food {
  id: string;
  name: string;
  macros: Macros; // per 100g
  category: string;
  portions?: FoodPortionDef[];
}

export interface FoodPortion {
  food: Food;
  grams: number;
  quantity?: number;
  unit?: 'unidade' | 'fatia' | 'colher' | 'xicara' | 'ml' | 'g' | 'dente';
  macros: Macros; // calculated for portion
}

export interface Meal {
  id: string;
  name: string;
  timing: MealTiming;
  foods: FoodPortion[];
  totalMacros: Macros;
  time?: string;
}

export interface MealPlan {
  id: string;
  name: string;
  goal: Goal;
  meals: Meal[];
  totalMacros: Macros;
  createdAt: string;
  isActive?: boolean;
  supplements?: SupplementRecommendation[];
}

export interface ProfessionalNutritionPlan {
  id: string;
  professionalId: string;
  studentId: string;
  title: string;
  objective?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  meals: Meal[];
  totalMacros: Macros;
  changeSummary?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface SupplementRecommendation {
  name: string;
  dose: string;
  timing: string;
  reason: string;
  caution?: string;
}

export interface Workout {
  id: string;
  name: string;
  type: WorkoutType;
  duration: number; // minutes
  intensity: 'low' | 'medium' | 'high';
  time?: string;
  splitId?: TrainingSplitId;
  splitDayId?: string;
  muscleGroups?: MuscleGroup[];
}

export interface ProfessionalExercise {
  id: string;
  visibility: 'global' | 'private';
  name: string;
  description: string;
  muscleGroups: MuscleGroup[];
  equipment?: string;
  modality: string;
  instructions: string;
  mediaUrl?: string;
  sourceAttribution?: string;
  safetyNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingPrescriptionItem {
  id: string;
  exerciseId: string;
  order: number;
  sets?: number;
  repetitions?: string;
  durationSeconds?: number;
  load?: number;
  loadUnit?: 'kg' | 'lb' | 'bodyweight' | 'band' | 'other';
  restSeconds?: number;
  targetRpe?: number;
  targetRir?: number;
  tempo?: string;
  notes?: string;
  alternativeExerciseId?: string;
  progressionCriteria?: string;
}

export interface TrainingPrescriptionSession {
  id: string;
  name: string;
  order: number;
  items: TrainingPrescriptionItem[];
}

export interface ProfessionalTrainingPlan {
  id: string;
  professionalId: string;
  studentId: string;
  title: string;
  objective?: string;
  startsOn?: string;
  endsOn?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  versionId: string;
  sessions: TrainingPrescriptionSession[];
  changeSummary?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ProfessionalTrainingExecution {
  id: string;
  planId: string;
  version: number;
  sessionId: string;
  studentId: string;
  workoutId?: string;
  status: 'in_progress' | 'completed';
  results: Array<{
    itemId: string;
    sets: Array<{
      setNumber: number;
      repetitions?: number;
      durationSeconds?: number;
      load?: number;
      loadUnit?: TrainingPrescriptionItem['loadUnit'];
      rpe?: number;
      notes?: string;
    }>;
    notes?: string;
  }>;
  perceivedExertion?: number;
  feedback?: string;
  performedAt: string;
  createdAt: string;
}

export type ProfessionalAppointmentType =
  | 'nutrition_consultation'
  | 'nutrition_assessment'
  | 'fitness_session'
  | 'fitness_assessment';

export interface ProfessionalAvailabilityRule {
  id: string;
  appointmentType: ProfessionalAppointmentType;
  weekday: number;
  startTime: string;
  endTime: string;
  timeZone: string;
  durationMinutes: number;
  slotIntervalMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeMinutes: number;
  maximumBookingDays: number;
  requestHoldMinutes: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalScheduleBlockout {
  id: string;
  recurrence: 'single' | 'weekly';
  startsAt?: string;
  endsAt?: string;
  weekday?: number;
  startTime?: string;
  endTime?: string;
  timeZone: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  reasonCategory: 'vacation' | 'holiday' | 'conference' | 'personal' | 'other';
  privateReason?: string;
  status: 'active' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalBookableSlot {
  ruleId: string;
  appointmentType: ProfessionalAppointmentType;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  durationMinutes: number;
}

export interface ProfessionalScheduleImpact {
  appointmentId: string;
  status: 'requested' | 'confirmed';
  startsAt: string;
  endsAt: string;
  allowedActions: Array<'keep' | 'decline' | 'cancel' | 'reschedule'>;
}

export type ProfessionalAppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'declined'
  | 'reschedule_proposed'
  | 'cancelled_by_student'
  | 'cancelled_by_professional'
  | 'completed'
  | 'no_show'
  | 'expired';

export interface ProfessionalAppointmentEvent {
  id: string;
  eventType: string;
  fromStatus?: ProfessionalAppointmentStatus;
  toStatus?: ProfessionalAppointmentStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ProfessionalAppointment {
  id: string;
  professionalId: string;
  studentId: string;
  appointmentType: ProfessionalAppointmentType;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  durationMinutes: number;
  status: ProfessionalAppointmentStatus;
  holdExpiresAt?: string;
  proposedSlots?: string[];
  neutralTitle: string;
  origin: 'student_request' | 'professional_reschedule';
  events: ProfessionalAppointmentEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalNotification {
  id: string;
  appointmentId?: string;
  notificationType: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface DailyLog {
  date: string;
  meals: Meal[];
  workouts: Workout[];
  weight?: number;
  waterMl?: number;
  totalMacros: Macros;
  notes?: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
  bodyFat?: number;
}

export interface WeeklySummary {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  daysTracked: number;
  adherencePercent: number;
}
