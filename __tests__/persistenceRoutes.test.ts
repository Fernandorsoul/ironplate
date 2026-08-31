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
import weightHistoryHandler from '../api/users/weight-history';
import dailyLogsHandler from '../api/users/daily-logs';

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

  it('stores a meal and derives its totals from the persisted food portions', async () => {
    const response = responseMock();

    await dailyLogsHandler({
      method: 'POST',
      headers: {},
      body: {
        userId,
        log: {
          date: '2026-08-31',
          meals: [{
            id: 'meal-1',
            name: 'Almoço',
            timing: 'regular',
            foods: [{
              food: {
                id: 'food-1',
                name: 'Arroz',
                category: 'carboidrato',
                macros: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
              },
              grams: 150,
              macros: { calories: 1, protein: 1, carbs: 1, fat: 1 },
            }],
            totalMacros: { calories: 999, protein: 999, carbs: 999, fat: 999 },
          }],
          workouts: [],
          totalMacros: { calories: 999, protein: 999, carbs: 999, fat: 999 },
        },
      },
    } as any, response);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const mealInsertCall = mockTransactionQuery.mock.calls.find(call =>
      (call[0] as TemplateStringsArray).join(' ').includes('INSERT INTO meals'),
    );
    expect(mealInsertCall).toBeDefined();
    expect(mealInsertCall?.slice(7, 11)).toEqual([195, 4.05, 42, 0.45]);
    const foodInsertCall = mockTransactionQuery.mock.calls.find(call =>
      (call[0] as TemplateStringsArray).join(' ').includes('INSERT INTO meal_foods'),
    );
    expect(foodInsertCall?.slice(7, 11)).toEqual([195, 4.05, 42, 0.45]);
    expect(response.status).toHaveBeenCalledWith(201);
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
