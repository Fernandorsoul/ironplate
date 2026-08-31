const mockTransactionQuery = jest.fn();
const mockTransaction = jest.fn();
const mockSql = Object.assign(jest.fn(), { transaction: mockTransaction });

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/rateLimit', () => ({
  generalRateLimit: async (_req: unknown, _res: unknown, next: () => unknown) => next(),
}));
jest.mock('../api/middleware/auth', () => ({
  requireUserAccess: jest.fn().mockResolvedValue({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
}));

import mealPlansHandler from '../api/users/meal-plans';
import dailyLogsHandler from '../api/users/daily-logs';
import weightHistoryHandler from '../api/users/weight-history';
import { calculateMacrosPer100Grams, normalizeMealFoods } from '../api/services/mealNutrition';
import { dailyLogPostSchema } from '../api/middleware/validation';

const userId = '550e8400-e29b-41d4-a716-446655440000';

function responseMock() {
  const response: any = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

function statementAt(index: number): string {
  return (mockTransactionQuery.mock.calls[index][0] as TemplateStringsArray).join(' ');
}

describe('daily-log, weight and meal-plan persistence routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionQuery.mockImplementation(() => Promise.resolve([]));
    mockTransaction.mockImplementation(async (buildQueries: (txn: typeof mockTransactionQuery) => Promise<unknown>[]) => {
      const queries = buildQueries(mockTransactionQuery);
      return Promise.all(queries);
    });
  });

  it('derives persisted meal totals from food portions', () => {
    const normalized = normalizeMealFoods([{
      food: {
        id: 'food-1',
        name: 'Arroz',
        category: 'carboidrato',
        macros: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      },
      grams: 150,
      macros: { calories: 1, protein: 1, carbs: 1, fat: 1 },
    }]);

    expect(normalized.foods[0].macros).toEqual({
      calories: 195,
      protein: 4.05,
      carbs: 42,
      fat: 0.45,
    });
    expect(normalized.totalMacros).toEqual(normalized.foods[0].macros);
    expect(calculateMacrosPer100Grams(normalized.foods[0].macros, 0)).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it('returns daily-log meals that can be saved again without corrupting macros', async () => {
    const storedRow = {
      log_id: `${userId}_2026-08-31`,
      date: '2026-08-31',
      log_weight: null,
      notes: null,
      meal_id: 'meal-1',
      meal_name: 'Almoço',
      timing: 'regular',
      meal_time: '12:00',
      total_calories: 195,
      total_protein: 4.05,
      total_carbs: 42,
      total_fat: 0.45,
      food_id: 'meal-1_0',
      food_ref_id: 'food-1',
      food_name: 'Arroz',
      food_category: 'carboidrato',
      grams: 150,
      quantity: 1.5,
      unit: 'xicara',
      calories: 195,
      protein: 4.05,
      carbs: 42,
      fat: 0.45,
      workout_id: null,
    };
    mockSql.mockResolvedValue([
      storedRow,
      { ...storedRow },
      {
        ...storedRow,
        meal_id: 'meal-2',
        meal_name: 'Refeição sem alimentos',
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        food_id: null,
        food_ref_id: null,
        food_name: null,
        food_category: null,
        grams: null,
        quantity: null,
        unit: null,
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        workout_id: 'workout-1',
        workout_name: 'Treino',
        type: 'strength',
        duration: 60,
        intensity: 'medium',
        workout_time: '18:00',
        split_id: null,
        split_day_id: null,
        muscle_groups_json: '["chest", 1]',
      },
    ]);
    const response = responseMock();

    await dailyLogsHandler({
      method: 'GET',
      headers: {},
      query: { userId, limit: '30' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    const logs = response.json.mock.calls[0][0];
    const log = logs[0];
    const portion = log.meals[0].foods[0];
    expect(portion).not.toHaveProperty('id');
    expect(portion).toMatchObject({
      grams: 150,
      quantity: 1.5,
      unit: 'xicara',
      macros: { calories: 195, protein: 4.05, carbs: 42, fat: 0.45 },
      food: {
        id: 'food-1',
        macros: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      },
    });
    expect(log.totalMacros).toEqual({ calories: 195, protein: 4.05, carbs: 42, fat: 0.45 });
    expect(dailyLogPostSchema.safeParse({ userId, log }).success).toBe(true);

    mockTransaction.mockClear();
    mockTransactionQuery.mockClear();
    const saveResponse = responseMock();
    await dailyLogsHandler({
      method: 'POST',
      headers: {},
      body: { userId, log },
    } as any, saveResponse);

    expect(saveResponse.status).toHaveBeenCalledWith(201);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(statementAt(5)).toContain('quantity, unit');
  });

  it('rejects unsupported methods and malformed daily logs before a transaction', async () => {
    const methodResponse = responseMock();
    await dailyLogsHandler({ method: 'DELETE', headers: {} } as any, methodResponse);
    expect(methodResponse.status).toHaveBeenCalledWith(405);

    const invalidPostResponse = responseMock();
    await dailyLogsHandler({
      method: 'POST',
      headers: {},
      body: { userId, log: { date: 'invalid' } },
    } as any, invalidPostResponse);
    expect(invalidPostResponse.status).toHaveBeenCalledWith(400);
    expect(mockTransaction).not.toHaveBeenCalled();

    const invalidGetResponse = responseMock();
    await dailyLogsHandler({
      method: 'GET',
      headers: {},
      query: { userId: 'invalid-user', limit: '30' },
    } as any, invalidGetResponse);
    expect(invalidGetResponse.status).toHaveBeenCalledWith(400);
  });

  it('stores a manual weight in history and the daily log in one transaction', async () => {
    const response = responseMock();

    await weightHistoryHandler({
      method: 'POST',
      headers: {},
      body: {
        userId,
        entry: { date: '2026-08-30', weight: 81.4 },
      },
    } as any, response);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransactionQuery).toHaveBeenCalledTimes(2);
    expect(statementAt(0)).toContain('INSERT INTO weight_history');
    expect(statementAt(0)).toContain('COALESCE(EXCLUDED.body_fat, weight_history.body_fat)');
    expect(statementAt(1)).toContain('INSERT INTO daily_logs');
    expect(statementAt(1)).toContain('ON CONFLICT(user_id, date)');
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it('deactivates the previous diet and stores a chosen diet atomically', async () => {
    const response = responseMock();

    await mealPlansHandler({
      method: 'POST',
      headers: {},
      body: {
        userId,
        plan: {
          id: 'plan-2',
          name: 'Plano escolhido',
          goal: 'maintenance',
          meals: [],
          totalMacros: { calories: 2000, protein: 150, carbs: 220, fat: 60 },
          createdAt: '2026-08-30T12:00:00.000Z',
          isActive: true,
        },
      },
    } as any, response);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransactionQuery).toHaveBeenCalledTimes(2);
    expect(statementAt(0)).toContain('SET is_active = false');
    expect(statementAt(1)).toContain('INSERT INTO meal_plans');
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it('activates a saved diet with one database update', async () => {
    mockSql.mockResolvedValue([{ id: 'plan-2' }]);
    const response = responseMock();

    await mealPlansHandler({
      method: 'PUT',
      headers: {},
      body: { userId, planId: 'plan-2' },
    } as any, response);

    expect(mockSql).toHaveBeenCalledTimes(1);
    const statement = (mockSql.mock.calls[0][0] as TemplateStringsArray).join(' ');
    expect(statement).toContain('SET is_active = (id =');
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
