import type { VercelResponse } from '@vercel/node';
import { z } from 'zod';

/**
 * Zod validation schemas shared by the API routes (issue #8).
 *
 * Enum values must stay in sync with src/types/index.ts.
 */

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailSchema = z
  .string()
  .trim()
  .regex(emailRegex, 'Invalid email format')
  .max(254, 'Email is too long');

const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .refine((value) => /[a-zA-Z]/.test(value), {
    message: 'Password must contain at least one letter',
  })
  .refine((value) => /\d/.test(value), {
    message: 'Password must contain at least one digit',
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
}).strict();

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: emailSchema,
  password: strongPasswordSchema,
}).strict();

export const userIdSchema = z.string().uuid('userId must be a valid UUID');

const professionalRegistrationSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  registrationType: z.string().trim().min(2).max(40),
  registrationNumber: z.string().trim().min(2).max(40),
  registrationRegion: z.string().trim().min(2).max(40),
  bio: z.string().trim().max(2_000).optional(),
}).strict();

export const professionalProfilePostSchema = professionalRegistrationSchema;

export const professionalProfileDecisionSchema = z.object({
  profileId: userIdSchema,
  decision: z.enum(['approve', 'reject']),
}).strict();

export const professionalLinkPostSchema = z.object({
  studentId: userIdSchema,
  purpose: z.string().trim().min(3).max(160),
  scopes: z.array(z.enum(['nutrition', 'training', 'scheduling'])).min(1).max(3),
  consentVersion: z.string().trim().min(1).max(40),
}).strict();

export const professionalLinkDecisionSchema = z.object({
  linkId: userIdSchema,
  decision: z.enum(['approve', 'revoke']),
}).strict();

export const administrativeIdentifierPostSchema = z.object({
  identifierType: z.literal('cpf'),
  value: z.string().trim().regex(/^\d{11}$/, 'CPF must contain 11 digits'),
}).strict();

const sportSchema = z.enum([
  'bodybuilding', 'bjj', 'both', 'running', 'cycling', 'swimming', 'soccer',
  'functional', 'calisthenics', 'walking', 'hybrid', 'other',
]);

const workoutTypeSchema = z.enum([
  'strength', 'bjj', 'running', 'cycling', 'swimming', 'soccer', 'functional',
  'calisthenics', 'walking', 'cardio', 'rest', 'other',
]);

const trainingSplitSchema = z.enum([
  'full_body', 'upper_lower', 'abc_classic', 'abc_antagonist',
  'push_pull_legs', 'abcd', 'abcde', 'custom',
]);

const muscleGroupSchema = z.enum([
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings',
  'glutes', 'calves', 'core', 'forearms', 'full_body',
]);

export const profilePhotoSchema = z
  .string()
  .max(2_000_000, 'Profile photo is too large')
  .regex(
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    'Profile photo must be a JPEG, PNG, or WebP data URI',
  );

export const updateSchema = z.object({
  userId: userIdSchema,
  fields: z
    .object({
      name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
      age: z.number().int().min(0).max(150).optional(),
      weight: z.number().min(0).max(500).optional(),
      height: z.number().min(0).max(300).optional(),
      gender: z.enum(['male', 'female']).optional(),
      activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
      goal: z.enum([
        'bulking',
        'weight_loss',
        'cutting_conservative',
        'cutting_preparation',
        'cutting_precontest',
        'maintenance',
      ]).optional(),
      sport: sportSchema.optional(),
      photoUri: profilePhotoSchema.optional(),
      targetWeightKg: z.number().finite().min(0).max(500).optional(),
      hydrationGoalMl: z.number().finite().min(0).max(20_000).optional(),
    })
    .strict()
    .refine((fields) => Object.keys(fields).length > 0, 'At least one field is required'),
}).strict();

export const forgotPasswordSchema = z.object({
  email: emailSchema,
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid reset token format'),
  newPassword: strongPasswordSchema,
}).strict();

const idSchema = z.string().trim().min(1).max(160);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm');
const timeZoneSchema = z.string().trim().min(1).max(100).refine((value) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, 'Invalid IANA time zone');
const nonNegativeNumber = z.number().finite().min(0).max(1_000_000);
const macrosSchema = z.object({
  calories: nonNegativeNumber,
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber,
}).strict();

const foodSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(100),
  macros: macrosSchema,
}).passthrough();

const portionUnitSchema = z.enum([
  'unidade', 'fatia', 'colher', 'xicara', 'ml', 'g', 'dente',
]);

const foodPortionSchema = z.object({
  food: foodSchema,
  grams: nonNegativeNumber.max(100_000),
  quantity: nonNegativeNumber.optional(),
  unit: portionUnitSchema.optional(),
  macros: macrosSchema,
}).strict();

const mealSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(160),
  timing: z.enum(['pre_workout', 'post_workout', 'regular']),
  foods: z.array(foodPortionSchema).max(200),
  totalMacros: macrosSchema,
  time: z.string().trim().max(20).optional(),
}).passthrough();

const workoutSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(160),
  type: workoutTypeSchema,
  duration: z.number().int().min(0).max(24 * 60),
  intensity: z.enum(['low', 'medium', 'high']),
  time: z.string().trim().max(20).optional(),
  splitId: trainingSplitSchema.optional(),
  splitDayId: z.string().trim().min(1).max(80).optional(),
  muscleGroups: z.array(muscleGroupSchema).max(12).optional(),
}).passthrough();

export const dailyLogPostSchema = z.object({
  userId: userIdSchema,
  log: z.object({
    date: dateSchema,
    meals: z.array(mealSchema).max(100),
    workouts: z.array(workoutSchema).max(100),
    weight: z.number().finite().min(0).max(500).optional(),
    waterMl: z.number().finite().min(0).max(20_000).optional(),
    totalMacros: macrosSchema,
    notes: z.string().max(5_000).optional(),
  }).strict(),
}).strict();

export const mealPlanPostSchema = z.object({
  userId: userIdSchema,
  plan: z.object({
    id: idSchema,
    name: z.string().trim().min(1).max(160),
    goal: z.enum([
      'bulking',
      'weight_loss',
      'cutting_conservative',
      'cutting_preparation',
      'cutting_precontest',
      'maintenance',
    ]),
    meals: z.array(mealSchema).max(100),
    totalMacros: macrosSchema,
    createdAt: z.string().max(64),
    isActive: z.boolean().optional(),
  }).passthrough(),
}).strict();

const professionalNutritionPlanContentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().max(500).optional(),
  meals: z.array(mealSchema).max(100),
  totalMacros: macrosSchema,
  changeSummary: z.string().trim().max(500).optional(),
});

export const professionalNutritionPlanPostSchema = z.object({
  studentId: userIdSchema,
  ...professionalNutritionPlanContentSchema.shape,
}).strict();

export const professionalNutritionPlanPutSchema = z.object({
  planId: idSchema,
  action: z.enum(['update', 'publish', 'archive']),
  ...professionalNutritionPlanContentSchema.partial().shape,
}).strict().superRefine((value, context) => {
  if (value.action === 'update' && (!value.title || !value.meals || !value.totalMacros)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'title, meals and totalMacros are required when updating a plan',
      path: ['action'],
    });
  }
});

const professionalExerciseContentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(3).max(2_000),
  muscleGroups: z.array(muscleGroupSchema).min(1).max(12),
  equipment: z.string().trim().max(120).optional(),
  modality: z.string().trim().min(2).max(80),
  instructions: z.string().trim().min(3).max(5_000),
  mediaUrl: z.url().max(2_000).optional(),
  sourceAttribution: z.string().trim().max(500).optional(),
  safetyNotes: z.string().trim().max(1_000).optional(),
});

export const professionalExercisePostSchema = professionalExerciseContentSchema.strict().superRefine((value, context) => {
  if (value.mediaUrl && !value.sourceAttribution) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'sourceAttribution is required when mediaUrl is provided',
      path: ['sourceAttribution'],
    });
  }
});

export const professionalExercisePutSchema = z.object({
  exerciseId: idSchema,
  ...professionalExerciseContentSchema.shape,
}).strict().superRefine((value, context) => {
  if (value.mediaUrl && !value.sourceAttribution) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'sourceAttribution is required when mediaUrl is provided',
      path: ['sourceAttribution'],
    });
  }
});

const trainingPrescriptionItemSchema = z.object({
  id: idSchema,
  exerciseId: idSchema,
  order: z.number().int().min(0).max(500),
  sets: z.number().int().min(1).max(30).optional(),
  repetitions: z.string().trim().max(40).optional(),
  durationSeconds: z.number().int().min(1).max(86_400).optional(),
  load: z.number().finite().min(0).max(10_000).optional(),
  loadUnit: z.enum(['kg', 'lb', 'bodyweight', 'band', 'other']).optional(),
  restSeconds: z.number().int().min(0).max(3_600).optional(),
  targetRpe: z.number().finite().min(0).max(10).optional(),
  targetRir: z.number().int().min(0).max(10).optional(),
  tempo: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1_000).optional(),
  alternativeExerciseId: idSchema.optional(),
  progressionCriteria: z.string().trim().max(1_000).optional(),
}).strict().refine(
  (item) => Boolean(item.repetitions || item.durationSeconds),
  { message: 'repetitions or durationSeconds is required' },
);

const trainingSessionSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(160),
  order: z.number().int().min(0).max(100),
  items: z.array(trainingPrescriptionItemSchema).min(1).max(100),
}).strict();

const professionalTrainingPlanContentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().max(500).optional(),
  startsOn: dateSchema.optional(),
  endsOn: dateSchema.optional(),
  sessions: z.array(trainingSessionSchema).min(1).max(30),
  changeSummary: z.string().trim().max(500).optional(),
});

export const professionalTrainingPlanPostSchema = z.object({
  studentId: userIdSchema,
  ...professionalTrainingPlanContentSchema.shape,
}).strict().refine(
  (value) => !value.startsOn || !value.endsOn || value.endsOn >= value.startsOn,
  { message: 'endsOn must be on or after startsOn', path: ['endsOn'] },
);

export const professionalTrainingPlanPutSchema = z.object({
  planId: idSchema,
  action: z.enum(['update', 'publish', 'archive']),
  ...professionalTrainingPlanContentSchema.partial().shape,
}).strict().superRefine((value, context) => {
  if (value.action === 'update' && (!value.title || !value.sessions)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'title and sessions are required when updating a training plan',
      path: ['action'],
    });
  }
  if (value.startsOn && value.endsOn && value.endsOn < value.startsOn) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endsOn must be on or after startsOn',
      path: ['endsOn'],
    });
  }
});

const trainingSetExecutionSchema = z.object({
  setNumber: z.number().int().min(1).max(100),
  repetitions: z.number().int().min(0).max(10_000).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  load: z.number().finite().min(0).max(10_000).optional(),
  loadUnit: z.enum(['kg', 'lb', 'bodyweight', 'band', 'other']).optional(),
  rpe: z.number().finite().min(0).max(10).optional(),
  notes: z.string().trim().max(1_000).optional(),
}).strict();

export const professionalTrainingExecutionPostSchema = z.object({
  planId: idSchema,
  version: z.number().int().min(1).max(10_000),
  sessionId: idSchema,
  workoutId: idSchema.optional(),
  status: z.enum(['in_progress', 'completed']).default('completed'),
  results: z.array(z.object({
    itemId: idSchema,
    sets: z.array(trainingSetExecutionSchema).max(100),
    notes: z.string().trim().max(1_000).optional(),
  }).strict()).max(100),
  perceivedExertion: z.number().finite().min(0).max(10).optional(),
  feedback: z.string().trim().max(2_000).optional(),
  performedAt: z.string().datetime({ offset: true }),
}).strict();

export const appointmentTypeSchema = z.enum([
  'nutrition_consultation',
  'nutrition_assessment',
  'fitness_session',
  'fitness_assessment',
]);

const availabilityRuleContentSchema = z.object({
  appointmentType: appointmentTypeSchema,
  weekday: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  timeZone: timeZoneSchema,
  durationMinutes: z.number().int().min(15).max(8 * 60),
  slotIntervalMinutes: z.number().int().min(5).max(8 * 60),
  bufferBeforeMinutes: z.number().int().min(0).max(4 * 60).default(0),
  bufferAfterMinutes: z.number().int().min(0).max(4 * 60).default(0),
  minimumNoticeMinutes: z.number().int().min(0).max(365 * 24 * 60).default(12 * 60),
  maximumBookingDays: z.number().int().min(1).max(365).default(90),
  effectiveFrom: dateSchema,
  effectiveUntil: dateSchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.endTime <= value.startTime) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'endTime must be after startTime', path: ['endTime'] });
  }
  if (value.effectiveUntil && value.effectiveUntil < value.effectiveFrom) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'effectiveUntil must be on or after effectiveFrom',
      path: ['effectiveUntil'],
    });
  }
});

const blockoutDecisionSchema = z.object({
  appointmentId: idSchema,
  action: z.enum(['keep', 'decline', 'cancel', 'reschedule']),
  proposedSlots: z.array(z.string().datetime({ offset: true })).min(1).max(5).optional(),
}).strict().superRefine((value, context) => {
  if (value.action === 'reschedule' && !value.proposedSlots?.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'proposedSlots is required for reschedule',
      path: ['proposedSlots'],
    });
  }
});

const singleBlockoutSchema = z.object({
  recurrence: z.literal('single'),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  timeZone: timeZoneSchema,
  reasonCategory: z.enum(['vacation', 'holiday', 'conference', 'personal', 'other']).default('other'),
  privateReason: z.string().trim().max(1_000).optional(),
}).strict().refine((value) => value.endsAt > value.startsAt, {
  message: 'endsAt must be after startsAt',
  path: ['endsAt'],
});

const recurringBlockoutSchema = z.object({
  recurrence: z.literal('weekly'),
  weekday: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  timeZone: timeZoneSchema,
  effectiveFrom: dateSchema,
  effectiveUntil: dateSchema.optional(),
  reasonCategory: z.enum(['vacation', 'holiday', 'conference', 'personal', 'other']).default('other'),
  privateReason: z.string().trim().max(1_000).optional(),
}).strict().superRefine((value, context) => {
  if (value.endTime <= value.startTime) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'endTime must be after startTime', path: ['endTime'] });
  }
  if (value.effectiveUntil && value.effectiveUntil < value.effectiveFrom) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'effectiveUntil must be on or after effectiveFrom',
      path: ['effectiveUntil'],
    });
  }
});

const blockoutContentSchema = z.discriminatedUnion('recurrence', [singleBlockoutSchema, recurringBlockoutSchema]);

export const professionalAvailabilityPostSchema = z.discriminatedUnion('resource', [
  z.object({ resource: z.literal('rule'), rule: availabilityRuleContentSchema }).strict(),
  z.object({
    resource: z.literal('blockout'),
    blockout: blockoutContentSchema,
    preview: z.boolean().default(false),
    impactDecisions: z.array(blockoutDecisionSchema).max(100).default([]),
  }).strict(),
]);

export const professionalAvailabilityPutSchema = z.discriminatedUnion('resource', [
  z.object({
    resource: z.literal('rule'),
    ruleId: idSchema,
    action: z.enum(['update', 'deactivate', 'reactivate']),
    rule: availabilityRuleContentSchema.optional(),
  }).strict().superRefine((value, context) => {
    if (value.action === 'update' && !value.rule) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'rule is required for update', path: ['rule'] });
    }
  }),
  z.object({
    resource: z.literal('blockout'),
    blockoutId: idSchema,
    action: z.enum(['update', 'cancel', 'cancel_future']),
    blockout: blockoutContentSchema.optional(),
    effectiveUntil: dateSchema.optional(),
    preview: z.boolean().default(false),
    impactDecisions: z.array(blockoutDecisionSchema).max(100).default([]),
  }).strict().superRefine((value, context) => {
    if (value.action === 'update' && !value.blockout) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'blockout is required for update', path: ['blockout'] });
    }
    if (value.action === 'cancel_future' && !value.effectiveUntil) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'effectiveUntil is required to cancel future occurrences',
        path: ['effectiveUntil'],
      });
    }
  }),
]);

export const professionalAvailabilitySlotsQuerySchema = z.object({
  professionalId: userIdSchema,
  appointmentType: appointmentTypeSchema,
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
}).strict().superRefine((value, context) => {
  const from = Date.parse(value.from);
  const to = Date.parse(value.to);
  if (to <= from) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'to must be after from', path: ['to'] });
  }
  if (to - from > 31 * 24 * 60 * 60 * 1_000) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Range cannot exceed 31 days', path: ['to'] });
  }
});

export const deleteMealPlanSchema = z.object({
  userId: userIdSchema,
  planId: idSchema,
}).strict();

export const activateMealPlanSchema = deleteMealPlanSchema;

export const weightEntryPostSchema = z.object({
  userId: userIdSchema,
  entry: z.object({
    date: dateSchema,
    weight: z.number().finite().min(0).max(500),
    bodyFat: z.number().finite().min(0).max(100).optional(),
  }).strict(),
}).strict();

export const customFoodPostSchema = z.object({
  userId: userIdSchema,
  food: foodSchema,
}).strict();

export const bodyMeasurementPostSchema = z.object({
  userId: userIdSchema,
  measurement: z.object({
    date: dateSchema,
    weight: z.number().finite().min(0).max(500),
  }).passthrough(),
}).strict();

export const limitSchema = z.coerce.number().int().min(1).max(100).default(30);

interface ValidationIssue {
  path: ReadonlyArray<PropertyKey>;
  message: string;
}

/**
 * Responds with 400 and a machine-readable list of the validation issues.
 */
export function validationError(res: VercelResponse, issues: readonly ValidationIssue[]): void {
  res.status(400).json({
    error: 'Validation failed',
    details: issues.map((issue) => ({
      field: issue.path.map(String).join('.') || '(root)',
      message: issue.message,
    })),
  });
}
