import {
  dailyLogPostSchema,
  limitSchema,
  loginSchema,
  mealPlanPostSchema,
  profilePhotoSchema,
  registerSchema,
  resetPasswordSchema,
  updateSchema,
  userIdSchema,
} from '../api/middleware/validation';

const userId = '550e8400-e29b-41d4-a716-446655440000';

describe('API input validation', () => {
  it('accepts a valid login and rejects malformed email or a short password', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'senha123' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'user@', password: 'senha123' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'curta' }).success).toBe(false);
  });

  it('enforces registration name, email and strong-password bounds', () => {
    expect(registerSchema.safeParse({
      name: 'Atleta',
      email: 'atleta@example.com',
      password: 'Segura123',
    }).success).toBe(true);
    expect(registerSchema.safeParse({ name: '', email: 'invalido', password: 'abcdefgh' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Atleta', email: 'a@b.com', password: '12345678' }).success).toBe(false);
  });

  it('requires a UUID for user identifiers', () => {
    expect(userIdSchema.safeParse(userId).success).toBe(true);
    expect(userIdSchema.safeParse('1 OR 1=1').success).toBe(false);
  });

  it('allows only explicitly supported update fields and bounded values', () => {
    expect(updateSchema.safeParse({ userId, fields: { weight: 82.5, goal: 'maintenance' } }).success).toBe(true);
    expect(updateSchema.safeParse({ userId, fields: { admin: true } }).success).toBe(false);
    expect(updateSchema.safeParse({ userId, fields: { age: 999 } }).success).toBe(false);
    expect(updateSchema.safeParse({ userId, fields: {} }).success).toBe(false);
    expect(updateSchema.safeParse({ userId, fields: { sport: 'swimming' } }).success).toBe(true);
  });

  it('accepts supported profile photo data URIs and rejects temporary or malformed URIs', () => {
    const photoUri = `data:image/jpeg;base64,${Buffer.from('profile-photo').toString('base64')}`;
    expect(profilePhotoSchema.safeParse(photoUri).success).toBe(true);
    expect(updateSchema.safeParse({ userId, fields: { photoUri } }).success).toBe(true);
    expect(profilePhotoSchema.safeParse('file:///cache/temporary-photo.jpg').success).toBe(false);
    expect(profilePhotoSchema.safeParse('data:text/plain;base64,dGVzdA==').success).toBe(false);
    expect(profilePhotoSchema.safeParse(`data:image/jpeg;base64,${'a'.repeat(2_000_000)}`).success).toBe(false);
  });

  it('requires a 256-bit reset token and a strong new password', () => {
    const token = 'a'.repeat(64);
    expect(resetPasswordSchema.safeParse({ token, newPassword: 'NovaSenha123' }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: 'curto', newPassword: 'NovaSenha123' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token, newPassword: 'semnumero' }).success).toBe(false);
  });

  it('deep-validates daily logs instead of accepting arbitrary payloads', () => {
    const valid = {
      userId,
      log: {
        date: '2026-08-28',
        meals: [],
        workouts: [],
        totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      },
    };
    expect(dailyLogPostSchema.safeParse(valid).success).toBe(true);
    expect(dailyLogPostSchema.safeParse({ ...valid, log: { date: '28/08/2026' } }).success).toBe(false);
    expect(dailyLogPostSchema.safeParse({ ...valid, log: { ...valid.log, weight: '80' } }).success).toBe(false);

    const structuredWorkout = {
      ...valid,
      log: {
        ...valid.log,
        workouts: [{
          id: 'workout-1',
          name: 'A — Peito e bíceps',
          type: 'strength',
          duration: 60,
          intensity: 'medium',
          splitId: 'abc_antagonist',
          splitDayId: 'chest_biceps',
          muscleGroups: ['chest', 'biceps'],
        }],
      },
    };
    expect(dailyLogPostSchema.safeParse(structuredWorkout).success).toBe(true);
  });

  it('validates meal plan structure and bounded query limits', () => {
    const plan = {
      id: 'plan-1',
      name: 'Plano',
      goal: 'maintenance',
      meals: [],
      totalMacros: { calories: 2000, protein: 150, carbs: 200, fat: 60 },
      createdAt: '2026-08-28T12:00:00.000Z',
    };
    expect(mealPlanPostSchema.safeParse({ userId, plan }).success).toBe(true);
    expect(mealPlanPostSchema.safeParse({ userId, plan: { ...plan, goal: 'invalid' } }).success).toBe(false);
    expect(limitSchema.safeParse('100').success).toBe(true);
    expect(limitSchema.safeParse('101').success).toBe(false);
  });

  it('accepts only strict, finite food portions with supported units', () => {
    const macros = { calories: 100, protein: 10, carbs: 12, fat: 2 };
    const food = { id: 'food-1', name: 'Alimento', category: 'teste', macros };
    const makePayload = (portion: Record<string, unknown>) => ({
      userId,
      plan: {
        id: 'plan-1',
        name: 'Plano',
        goal: 'maintenance',
        meals: [{
          id: 'meal-1',
          name: 'Refeição',
          timing: 'regular',
          foods: [{ food, grams: 100, macros, ...portion }],
          totalMacros: macros,
        }],
        totalMacros: macros,
        createdAt: '2026-08-29T12:00:00.000Z',
      },
    });

    for (const unit of ['unidade', 'fatia', 'colher', 'xicara', 'ml', 'g', 'dente']) {
      expect(mealPlanPostSchema.safeParse(makePayload({ quantity: 1, unit })).success).toBe(true);
    }

    expect(mealPlanPostSchema.safeParse(makePayload({
      quantity: 1,
      unit: '<img src=x onerror=alert(1)>',
    })).success).toBe(false);
    expect(mealPlanPostSchema.safeParse(makePayload({ quantity: -1, unit: 'g' })).success).toBe(false);
    expect(mealPlanPostSchema.safeParse(makePayload({ quantity: Number.POSITIVE_INFINITY, unit: 'g' })).success).toBe(false);
    expect(mealPlanPostSchema.safeParse(makePayload({ quantity: 1, unit: 'g', extra: true })).success).toBe(false);
  });
});
