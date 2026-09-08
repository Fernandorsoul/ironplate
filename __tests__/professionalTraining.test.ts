const mockTransactionQuery = jest.fn();
const mockTransaction = jest.fn();
const mockSql = Object.assign(jest.fn(), { transaction: mockTransaction });
const mockIsApprovedEducator = jest.fn();
const mockGetScopedActiveLink = jest.fn();

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/rateLimit', () => ({
  generalRateLimit: async (_req: unknown, _res: unknown, next: () => unknown) => next(),
}));
jest.mock('../api/middleware/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
}));
jest.mock('../api/services/professionalAccess', () => ({
  isApprovedEducator: (...args: unknown[]) => mockIsApprovedEducator(...args),
  getScopedActiveLink: (...args: unknown[]) => mockGetScopedActiveLink(...args),
}));
jest.mock('../api/services/audit', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));

import exercisesHandler from '../api/professionals/exercises';
import trainingExecutionsHandler from '../api/professionals/training-executions';
import trainingPlansHandler from '../api/professionals/training-plans';

const studentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const professionalId = '550e8400-e29b-41d4-a716-446655440000';
const sessions = [{
  id: 'session-a',
  name: 'Treino A',
  order: 0,
  items: [{
    id: 'item-a',
    exerciseId: 'global-barbell-squat',
    order: 0,
    sets: 3,
    repetitions: '8-10',
  }],
}];
const exercisePayload = {
  name: 'Agachamento privado',
  description: 'Movimento composto adaptado.',
  muscleGroups: ['quadriceps', 'glutes'],
  equipment: 'Barra',
  modality: 'strength',
  instructions: 'Execute conforme a prescricao.',
};

function responseMock() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

function sqlStatement(mock: jest.Mock, index = 0): string {
  return (mock.mock.calls[index][0] as TemplateStringsArray).join(' ');
}

describe('professional workout prescriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReset();
    mockSql.mockResolvedValue([]);
    mockIsApprovedEducator.mockResolvedValue(true);
    mockGetScopedActiveLink.mockResolvedValue('link-1');
    mockTransactionQuery.mockResolvedValue([]);
    mockTransaction.mockImplementation(async (buildQueries: (txn: typeof mockTransactionQuery) => Promise<unknown>[]) => {
      const queries = buildQueries(mockTransactionQuery);
      return Promise.all(queries);
    });
  });

  it('blocks private exercise creation for a professional without approved CREF credentials', async () => {
    mockIsApprovedEducator.mockResolvedValue(false);
    const response = responseMock();

    await exercisesHandler({
      method: 'POST',
      headers: {},
      body: {
        name: 'Exercicio privado',
        description: 'Descricao do movimento',
        muscleGroups: ['core'],
        modality: 'strength',
        instructions: 'Instrucao segura.',
      },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('shows a student only global exercises and private exercises referenced by an active plan', async () => {
    mockIsApprovedEducator.mockResolvedValue(false);
    mockSql.mockResolvedValueOnce([]);
    const response = responseMock();

    await exercisesHandler({ method: 'GET', headers: {}, query: {} } as any, response);

    const statement = sqlStatement(mockSql);
    expect(statement).toContain("visibility = 'global'");
    expect(statement).toContain('p.student_id =');
    expect(statement).toContain("c.scopes_json::jsonb ? 'training'");
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('maps the exercise catalog for an approved educator', async () => {
    mockSql.mockResolvedValueOnce([{
      id: 'exercise-1',
      visibility: 'private',
      name: exercisePayload.name,
      description: exercisePayload.description,
      muscle_groups_json: '["quadriceps","glutes"]',
      equipment: null,
      modality: 'strength',
      instructions: exercisePayload.instructions,
      media_url: null,
      source_attribution: null,
      safety_notes: null,
      created_at: '2026-09-08T12:00:00.000Z',
      updated_at: '2026-09-08T12:00:00.000Z',
    }]);
    const response = responseMock();

    await exercisesHandler({ method: 'GET', headers: {}, query: {} } as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([expect.objectContaining({
      id: 'exercise-1',
      muscleGroups: ['quadriceps', 'glutes'],
    })]);
  });

  it('creates and updates only private exercises owned by the educator', async () => {
    mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'exercise-1' }]);
    const createResponse = responseMock();
    const updateResponse = responseMock();

    await exercisesHandler({ method: 'POST', headers: {}, body: exercisePayload } as any, createResponse);
    await exercisesHandler({
      method: 'PUT',
      headers: {},
      body: { exerciseId: 'exercise-1', ...exercisePayload },
    } as any, updateResponse);

    expect(createResponse.status).toHaveBeenCalledWith(201);
    expect(sqlStatement(mockSql, 0)).toContain("'private'");
    expect(sqlStatement(mockSql, 1)).toContain('owner_professional_id =');
    expect(updateResponse.status).toHaveBeenCalledWith(200);
  });

  it('requires attribution when a private exercise includes external media', async () => {
    const response = responseMock();

    await exercisesHandler({
      method: 'POST',
      headers: {},
      body: { ...exercisePayload, mediaUrl: 'https://example.com/video.mp4' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('creates a versioned draft only with accessible exercises and training consent', async () => {
    mockSql.mockResolvedValueOnce([{ id: 'global-barbell-squat' }]);
    const response = responseMock();

    await trainingPlansHandler({
      method: 'POST',
      headers: {},
      body: { studentId, title: 'Base de forca', sessions },
    } as any, response);

    expect(mockGetScopedActiveLink).toHaveBeenCalledWith(mockSql, professionalId, studentId, 'training');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(sqlStatement(mockTransactionQuery, 0)).toContain('professional_training_plans');
    expect(sqlStatement(mockTransactionQuery, 1)).toContain('professional_training_plan_versions');
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ version: 1, status: 'draft' }));
  });

  it('rejects exercises owned by another professional', async () => {
    mockSql.mockResolvedValueOnce([]);
    const response = responseMock();

    await trainingPlansHandler({
      method: 'POST',
      headers: {},
      body: { studentId, title: 'Plano isolado', sessions },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns the current version of plans authored by the educator', async () => {
    mockSql.mockResolvedValueOnce([{
      id: 'plan-1',
      professional_id: professionalId,
      student_id: studentId,
      title: 'Base de forca',
      objective: null,
      starts_on: null,
      ends_on: null,
      status: 'draft',
      version: 1,
      version_id: 'version-1',
      sessions_json: JSON.stringify(sessions),
      change_summary: null,
      created_at: '2026-09-08T12:00:00.000Z',
      updated_at: '2026-09-08T12:00:00.000Z',
      published_at: null,
    }]);
    const response = responseMock();

    await trainingPlansHandler({ method: 'GET', headers: {}, query: {} } as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([expect.objectContaining({
      id: 'plan-1',
      sessions,
      version: 1,
    })]);
  });

  it('creates a new immutable draft version when a plan is edited', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 'plan-1', student_id: studentId, current_version: 1 }])
      .mockResolvedValueOnce([{ id: 'global-barbell-squat' }]);
    const response = responseMock();

    await trainingPlansHandler({
      method: 'PUT',
      headers: {},
      body: { planId: 'plan-1', action: 'update', title: 'Base atualizada', sessions },
    } as any, response);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(sqlStatement(mockTransactionQuery, 0)).toContain('professional_training_plan_versions');
    expect(response.json).toHaveBeenCalledWith({
      id: 'plan-1',
      version: 2,
      status: 'draft',
      versionStatus: 'draft',
    });
  });

  it.each([
    ['publish', 'published'],
    ['archive', 'archived'],
  ] as const)('%s a plan without mutating its previous versions', async (action, status) => {
    mockSql.mockResolvedValueOnce([{ id: 'plan-1', student_id: studentId, current_version: 2 }]);
    const response = responseMock();

    await trainingPlansHandler({
      method: 'PUT',
      headers: {},
      body: { planId: 'plan-1', action },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'plan-1', status }));
  });

  it('blocks plan changes immediately after training consent is revoked', async () => {
    mockSql.mockResolvedValueOnce([{ id: 'plan-1', student_id: studentId, current_version: 1 }]);
    mockGetScopedActiveLink.mockResolvedValue(undefined);
    const response = responseMock();

    await trainingPlansHandler({
      method: 'PUT',
      headers: {},
      body: { planId: 'plan-1', action: 'publish' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('records execution against the immutable published version and prescribed items', async () => {
    mockSql
      .mockResolvedValueOnce([{
        professional_id: professionalId,
        student_id: professionalId,
        version_id: 'version-1',
        sessions_json: JSON.stringify(sessions),
      }])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await trainingExecutionsHandler({
      method: 'POST',
      headers: {},
      body: {
        planId: 'plan-1',
        version: 1,
        sessionId: 'session-a',
        results: [{ itemId: 'item-a', sets: [{ setNumber: 1, repetitions: 10, rpe: 8 }] }],
        performedAt: '2026-09-08T12:00:00.000Z',
      },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(201);
    expect(sqlStatement(mockSql, 1)).toContain('professional_training_executions');
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
  });

  it('rejects execution results for an item outside the prescribed session', async () => {
    mockSql.mockResolvedValueOnce([{
      professional_id: professionalId,
      student_id: professionalId,
      version_id: 'version-1',
      sessions_json: JSON.stringify(sessions),
    }]);
    const response = responseMock();

    await trainingExecutionsHandler({
      method: 'POST',
      headers: {},
      body: {
        planId: 'plan-1',
        version: 1,
        sessionId: 'session-a',
        results: [{ itemId: 'foreign-item', sets: [] }],
        performedAt: '2026-09-08T12:00:00.000Z',
      },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('returns only executions visible through an active training consent', async () => {
    mockIsApprovedEducator.mockResolvedValue(false);
    mockSql.mockResolvedValueOnce([{
      id: 'execution-1',
      plan_id: 'plan-1',
      version: 1,
      session_id: 'session-a',
      student_id: professionalId,
      workout_id: null,
      status: 'completed',
      results_json: '[{"itemId":"item-a","sets":[]}]',
      perceived_exertion: null,
      feedback: null,
      performed_at: '2026-09-08T12:00:00.000Z',
      created_at: '2026-09-08T12:01:00.000Z',
    }]);
    const response = responseMock();

    await trainingExecutionsHandler({ method: 'GET', headers: {}, query: {} } as any, response);

    expect(sqlStatement(mockSql)).toContain('e.student_id =');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([expect.objectContaining({
      id: 'execution-1',
      results: [{ itemId: 'item-a', sets: [] }],
    })]);
  });

  it('links an execution only to a workout owned by the student', async () => {
    mockSql
      .mockResolvedValueOnce([{
        professional_id: professionalId,
        student_id: professionalId,
        version_id: 'version-1',
        sessions_json: JSON.stringify(sessions),
      }])
      .mockResolvedValueOnce([{ id: 'workout-1' }])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await trainingExecutionsHandler({
      method: 'POST',
      headers: {},
      body: {
        planId: 'plan-1',
        version: 1,
        sessionId: 'session-a',
        workoutId: 'workout-1',
        results: [],
        performedAt: '2026-09-08T12:00:00.000Z',
      },
    } as any, response);

    expect(sqlStatement(mockSql, 1)).toContain('JOIN daily_logs');
    expect(sqlStatement(mockSql, 2)).toContain('professional_training_executions');
    expect(response.status).toHaveBeenCalledWith(201);
  });
});
