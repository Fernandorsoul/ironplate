const mockSql = jest.fn();
const mockAuthorize = jest.fn();

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
}));
jest.mock('../api/services/authorization', () => ({
  authorizeUserDataAccess: (...args: unknown[]) => mockAuthorize(...args),
}));

import sharedDataHandler from '../api/professionals/shared-data';

const studentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function responseMock() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe('granular professional data access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReset();
  });

  it('does not query student data when the requested category lacks consent', async () => {
    mockAuthorize.mockResolvedValue({ allowed: false, reason: 'missing_consent' });
    const response = responseMock();

    await sharedDataHandler({
      method: 'GET',
      headers: {},
      query: { studentId, scope: 'body_measurements' },
    } as any, response);

    expect(mockAuthorize).toHaveBeenCalledWith(mockSql, expect.objectContaining({
      subjectUserId: studentId,
      scope: 'body_measurements',
      action: 'read',
    }));
    expect(mockSql).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });

  it('returns only the explicitly selected category after authorization', async () => {
    mockAuthorize.mockResolvedValue({ allowed: true, reason: 'active_consent', linkId: 'link-1' });
    mockSql.mockResolvedValue([{ date: '2026-09-08', weight: 80 }]);
    const response = responseMock();

    await sharedDataHandler({
      method: 'GET',
      headers: {},
      query: { studentId, scope: 'weight' },
    } as any, response);

    const statement = (mockSql.mock.calls[0][0] as TemplateStringsArray).join(' ');
    expect(statement).toContain('FROM weight_history');
    expect(statement).not.toContain('body_measurements');
    expect(response.json).toHaveBeenCalledWith({
      scope: 'weight',
      data: [{ date: '2026-09-08', weight: 80 }],
    });
  });

  it('rejects malformed IDs before authorization or database access', async () => {
    const response = responseMock();

    await sharedDataHandler({
      method: 'GET',
      headers: {},
      query: { studentId: '../other-user', scope: 'weight' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockAuthorize).not.toHaveBeenCalled();
    expect(mockSql).not.toHaveBeenCalled();
  });
});
