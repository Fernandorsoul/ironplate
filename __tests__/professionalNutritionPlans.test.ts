const mockTransactionQuery = jest.fn();
const mockTransaction = jest.fn();
const mockSql = Object.assign(jest.fn(), { transaction: mockTransaction });

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/rateLimit', () => ({
  generalRateLimit: async (_req: unknown, _res: unknown, next: () => unknown) => next(),
}));
jest.mock('../api/middleware/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
}));
jest.mock('../api/services/audit', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));
const mockGetScopedActiveLink = jest.fn();
jest.mock('../api/services/professionalAccess', () => ({
  getScopedActiveLink: (...args: unknown[]) => mockGetScopedActiveLink(...args),
}));

import nutritionPlansHandler from '../api/professionals/nutrition-plans';

const professionalId = '550e8400-e29b-41d4-a716-446655440000';
const studentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function responseMock() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

function statementAt(index: number): string {
  return (mockTransactionQuery.mock.calls[index][0] as TemplateStringsArray).join(' ');
}

function sqlCallStatement(index: number): string {
  return (mockSql.mock.calls[index][0] as TemplateStringsArray).join(' ');
}

describe('professional nutrition plans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReset();
    mockSql.mockResolvedValue([]);
    mockTransaction.mockImplementation(async (buildQueries: (txn: typeof mockTransactionQuery) => Promise<unknown>[]) => {
      const queries = buildQueries(mockTransactionQuery);
      return Promise.all(queries);
    });
    mockTransactionQuery.mockResolvedValue([]);
    mockGetScopedActiveLink.mockResolvedValue('link-1');
  });

  it('creates only a draft for an active, consented student link', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 'professional-profile' }])
      .mockResolvedValueOnce([{ id: 'link-1' }])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await nutritionPlansHandler({
      method: 'POST',
      headers: {},
      body: {
        studentId,
        title: 'Plano de acompanhamento',
        objective: 'Organizar a rotina alimentar',
        meals: [],
        totalMacros: { calories: 2000, protein: 150, carbs: 220, fat: 60 },
      },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(201);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransactionQuery).toHaveBeenCalledTimes(2);
    expect(statementAt(0)).toContain('professional_nutrition_plans');
    expect(statementAt(1)).toContain('professional_nutrition_plan_versions');
    expect(statementAt(1)).toContain("'draft'");
  });

  it('does not allow publishing an unknown plan', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 'professional-profile' }])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await nutritionPlansHandler({
      method: 'PUT',
      headers: {},
      body: { planId: 'missing-plan', action: 'publish' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('rejects incomplete version updates before touching the database', async () => {
    mockSql.mockResolvedValueOnce([{ id: 'professional-profile' }]);
    const response = responseMock();

    await nutritionPlansHandler({
      method: 'PUT',
      headers: {},
      body: { planId: 'plan-1', action: 'update', title: 'Incompleto' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('keeps the published version visible while a new nutrition draft is prepared', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 'professional-profile' }])
      .mockResolvedValueOnce([{
        id: 'plan-1',
        student_id: studentId,
        current_version: 1,
        published_version: 1,
      }])
      .mockResolvedValueOnce([{ id: 'link-1' }]);
    const response = responseMock();

    await nutritionPlansHandler({
      method: 'PUT',
      headers: {},
      body: {
        planId: 'plan-1',
        action: 'update',
        title: 'Plano revisado',
        meals: [],
        totalMacros: { calories: 1900, protein: 145, carbs: 200, fat: 58 },
      },
    } as any, response);

    expect(statementAt(1)).toContain("CASE WHEN published_version IS NULL THEN 'draft' ELSE 'published' END");
    expect(response.json).toHaveBeenCalledWith({
      id: 'plan-1',
      version: 2,
      status: 'published',
      versionStatus: 'draft',
    });
  });

  it('serves students from publishedVersion rather than an unpublished current draft', async () => {
    mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const response = responseMock();

    await nutritionPlansHandler({ method: 'GET', headers: {}, query: {} } as any, response);

    expect(sqlCallStatement(1)).toContain('v.version = p.published_version');
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
