const mockSql = jest.fn();

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
}));
jest.mock('../api/services/audit', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));

import linksHandler from '../api/professionals/links';

const studentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function responseMock() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

function statementAt(index: number): string {
  return (mockSql.mock.calls[index][0] as TemplateStringsArray).join(' ');
}

describe('professional consent links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReset();
  });

  it('returns an existing link to pending when new granular scopes require consent', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: 'profile-1' }])
      .mockResolvedValueOnce([{ id: studentId }])
      .mockResolvedValueOnce([{ id: 'link-1', status: 'active' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await linksHandler({
      method: 'POST',
      headers: {},
      body: {
        studentId,
        purpose: 'Prescricao e acompanhamento de treino',
        scopes: ['training'],
        consentVersion: '2026-09',
      },
    } as any, response);

    expect(statementAt(3)).toContain("status = 'pending'");
    expect(statementAt(4)).toContain("status = 'requested'");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ id: 'link-1', status: 'pending' });
  });
});
