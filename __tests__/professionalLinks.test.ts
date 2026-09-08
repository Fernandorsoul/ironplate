const mockTransactionQuery = jest.fn();
const mockTransaction = jest.fn();
const mockSql = Object.assign(jest.fn(), { transaction: mockTransaction });
const mockAudit = jest.fn();

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
}));
jest.mock('../api/services/audit', () => ({
  writeAuditLog: (...args: unknown[]) => mockAudit(...args),
}));

import linksHandler from '../api/professionals/links';

const professionalId = '550e8400-e29b-41d4-a716-446655440000';
const studentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const linkId = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
const token = 'a'.repeat(64);

function responseMock() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

function sqlStatement(index: number): string {
  return (mockSql.mock.calls[index][0] as TemplateStringsArray).join(' ');
}

function transactionStatement(index: number): string {
  return (mockTransactionQuery.mock.calls[index][0] as TemplateStringsArray).join(' ');
}

describe('professional consent links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReset();
    mockAudit.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (
      buildQueries: (txn: typeof mockTransactionQuery) => Promise<unknown>[],
    ) => Promise.all(buildQueries(mockTransactionQuery)));
    mockTransactionQuery.mockResolvedValue([]);
  });

  it('issues a one-time invitation without receiving or exposing a student identifier', async () => {
    mockSql
      .mockResolvedValueOnce([{ professional_role: 'nutritionist' }])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await linksHandler({
      method: 'POST',
      headers: {},
      query: {},
      body: {
        purpose: 'Acompanhamento nutricional individual',
        scopes: ['meal_plans', 'weight'],
        professionalRoles: ['nutritionist'],
        consentVersion: '2026-09',
        expiresInHours: 48,
        durationDays: 180,
      },
    } as any, response);

    expect(sqlStatement(1)).toContain('professional_link_invitations');
    expect(sqlStatement(1)).toContain('token_hash');
    const payload = response.json.mock.calls[0][0];
    expect(payload.token).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.invitationUrl).toContain(payload.token);
    expect(payload.qrPayload).toBe(payload.invitationUrl);
    expect(mockSql.mock.calls[1]).not.toContain(payload.token);
    expect(JSON.stringify(payload)).not.toContain(studentId);
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it('returns a generic unavailable response for expired or already used invitations', async () => {
    mockSql.mockResolvedValueOnce([]);
    const response = responseMock();

    await linksHandler({
      method: 'GET',
      headers: {},
      query: { token },
    } as any, response);

    expect(sqlStatement(0)).toContain("status = 'issued'");
    expect(sqlStatement(0)).toContain('expires_at > NOW()');
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: 'Invitation unavailable' });
  });

  it('accepts an invitation atomically with only a subset of requested scopes', async () => {
    mockSql
      .mockResolvedValueOnce([{
        id: 'invitation-1',
        professional_id: 'professional-1',
        professional_roles_json: '["nutritionist"]',
        purpose: 'Acompanhamento',
        scopes_json: '["meal_plans","weight"]',
        consent_version: '2026-09',
        duration_days: 365,
      }])
      .mockResolvedValueOnce([{ id: linkId }]);
    const response = responseMock();

    await linksHandler({
      method: 'PUT',
      headers: {},
      query: {},
      body: { decision: 'accept', token, scopes: ['weight'] },
    } as any, response);

    expect(sqlStatement(1)).toContain('WITH claimed AS');
    expect(sqlStatement(1)).toContain("status = 'accepted'");
    expect(sqlStatement(1)).toContain('INSERT INTO consent_records');
    expect(sqlStatement(1)).toContain("'granted'");
    expect(response.json).toHaveBeenCalledWith({
      id: linkId,
      status: 'active',
      grantedScopes: ['weight'],
    });
  });

  it('prevents a student from expanding consent beyond the invitation', async () => {
    mockSql.mockResolvedValueOnce([{
      id: 'invitation-1',
      professional_id: 'professional-1',
      scopes_json: '["weight"]',
      consent_version: '2026-09',
      duration_days: 365,
    }]);
    const response = responseMock();

    await linksHandler({
      method: 'PUT',
      headers: {},
      query: {},
      body: { decision: 'accept', token, scopes: ['body_measurements'] },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('blocks URL or payload bypass by users who do not own the consent', async () => {
    mockSql.mockResolvedValueOnce([{
      id: linkId,
      professional_id: 'professional-1',
      student_id: studentId,
      purpose: 'Acompanhamento',
      requested_scopes_json: '["weight"]',
    }]);
    const response = responseMock();

    await linksHandler({
      method: 'PUT',
      headers: {},
      query: {},
      body: { decision: 'revoke', linkId },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('revokes immediately by appending a consent snapshot and audit event', async () => {
    mockSql
      .mockResolvedValueOnce([{
        id: linkId,
        professional_id: 'professional-1',
        student_id: professionalId,
        status: 'active',
        purpose: 'Acompanhamento',
        consent_version: '2026-09',
        requested_scopes_json: '["weight"]',
      }])
      .mockResolvedValueOnce([{ link_id: linkId }]);
    const response = responseMock();

    await linksHandler({
      method: 'PUT',
      headers: {},
      query: {},
      body: { decision: 'revoke', linkId },
    } as any, response);

    expect(sqlStatement(1)).toContain('WITH active_link AS');
    expect(sqlStatement(1)).toContain("status = 'revoked'");
    expect(sqlStatement(1)).toContain('INSERT INTO consent_records');
    expect(sqlStatement(1)).toContain("'revoked'");
    expect(mockAudit).toHaveBeenCalledWith(mockSql, expect.objectContaining({
      action: 'professional_student_link.revoked',
      entityId: linkId,
    }));
    expect(response.json).toHaveBeenCalledWith({ id: linkId, status: 'revoked' });
  });

  it('limits scopes atomically while preserving the consent history', async () => {
    mockSql
      .mockResolvedValueOnce([{
        id: linkId,
        professional_id: 'professional-1',
        student_id: professionalId,
        status: 'active',
        purpose: 'Acompanhamento',
        consent_version: '2026-09',
        requested_scopes_json: '["weight","body_measurements"]',
        expires_at: '2027-09-08T00:00:00.000Z',
      }])
      .mockResolvedValueOnce([{ link_id: linkId }]);
    const response = responseMock();

    await linksHandler({
      method: 'PUT',
      headers: {},
      query: {},
      body: { decision: 'limit', linkId, scopes: ['weight'] },
    } as any, response);

    expect(sqlStatement(1)).toContain('WITH active_link AS');
    expect(sqlStatement(1)).toContain('INSERT INTO consent_records');
    expect(mockAudit).toHaveBeenCalledWith(mockSql, expect.objectContaining({
      action: 'professional_student_link.scopes_limited',
      metadata: { scopes: ['weight'] },
    }));
    expect(response.json).toHaveBeenCalledWith({
      id: linkId,
      status: 'active',
      grantedScopes: ['weight'],
    });
  });

  it('does not append a revocation snapshot when another request already revoked the link', async () => {
    mockSql
      .mockResolvedValueOnce([{
        id: linkId,
        professional_id: 'professional-1',
        student_id: professionalId,
        status: 'active',
        purpose: 'Acompanhamento',
        consent_version: '2026-09',
        requested_scopes_json: '["weight"]',
      }])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await linksHandler({
      method: 'PUT',
      headers: {},
      query: {},
      body: { decision: 'revoke', linkId },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(mockAudit).not.toHaveBeenCalled();
  });
});
