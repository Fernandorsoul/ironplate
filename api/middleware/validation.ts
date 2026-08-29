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
        'cutting_conservative',
        'cutting_preparation',
        'cutting_precontest',
        'maintenance',
      ]).optional(),
      sport: sportSchema.optional(),
      photoUri: profilePhotoSchema.optional(),
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

export const deleteMealPlanSchema = z.object({
  userId: userIdSchema,
  planId: idSchema,
}).strict();

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
