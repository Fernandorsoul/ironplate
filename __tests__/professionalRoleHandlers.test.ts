const mockTransactionQuery = jest.fn();
const mockTransaction = jest.fn();
const mockSql = Object.assign(jest.fn(), { transaction: mockTransaction });
const mockAudit = jest.fn();

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ userId: 'student-1' }),
  requireRole: jest.fn().mockResolvedValue({ userId: 'admin-1' }),
}));
jest.mock('../api/services/audit', () => ({
  writeAuditLog: (...args: unknown[]) => mockAudit(...args),
}));

import profileHandler from '../api/professionals/profile';
import reviewHandler from '../api/professionals/review';

function responseMock() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

function transactionStatement(index: number): string {
  return (mockTransactionQuery.mock.calls[index][0] as TemplateStringsArray).join(' ');
}

describe('professional role handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReset();
    mockAudit.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (
      buildQueries: (txn: typeof mockTransactionQuery) => Promise<unknown>[],
    ) => Promise.all(buildQueries(mockTransactionQuery)));
    mockTransactionQuery.mockResolvedValue([]);
  });

  it('submits two independent credentials without removing the student role', async () => {
    mockSql.mockResolvedValueOnce([]);
    const response = responseMock();

    await profileHandler({
      method: 'POST',
      headers: {},
      body: {
        displayName: 'Ana Silva',
        credentials: [
          {
            professionalRole: 'nutritionist',
            registrationType: 'CRN',
            registrationNumber: '12345',
            registrationRegion: 'SP',
          },
          {
            professionalRole: 'fitness_professional',
            registrationType: 'CREF',
            registrationNumber: '67890-G',
            registrationRegion: 'SP',
          },
        ],
      },
    } as any, response);

    expect(mockTransactionQuery).toHaveBeenCalledTimes(5);
    expect(transactionStatement(1)).toContain('professional_credentials');
    expect(transactionStatement(2)).toContain('user_roles');
    expect(transactionStatement(3)).toContain('professional_credentials');
    expect(transactionStatement(4)).toContain('user_roles');
    expect(mockTransactionQuery.mock.calls.flat()).not.toContain('student');
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
      credentials: [
        { role: 'nutritionist', status: 'pending' },
        { role: 'fitness_professional', status: 'pending' },
      ],
    }));
  });

  it('approves one credential without overwriting another professional role', async () => {
    mockSql.mockResolvedValueOnce([{
      id: 'credential-1',
      user_id: 'student-1',
      professional_role: 'nutritionist',
    }]);
    const response = responseMock();

    await reviewHandler({
      method: 'PUT',
      headers: {},
      body: { credentialId: 'credential-1', decision: 'approve' },
    } as any, response);

    expect(mockTransactionQuery).toHaveBeenCalledTimes(4);
    expect(transactionStatement(0)).toContain('UPDATE professional_credentials');
    expect(transactionStatement(1)).toContain('ON CONFLICT (user_id, role)');
    expect(transactionStatement(2)).toContain('id <>');
    expect(transactionStatement(3)).toContain('id <>');
    expect(mockAudit).toHaveBeenCalledWith(mockSql, expect.objectContaining({
      action: 'professional_credential.approved',
      entityId: 'credential-1',
      metadata: { status: 'verified', role: 'nutritionist' },
    }));
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('suspends only the selected role and records an auditable decision', async () => {
    mockSql.mockResolvedValueOnce([{
      id: 'credential-2',
      user_id: 'student-1',
      professional_role: 'fitness_professional',
    }]);
    const response = responseMock();

    await reviewHandler({
      method: 'PUT',
      headers: {},
      body: { credentialId: 'credential-2', decision: 'suspend' },
    } as any, response);

    expect(mockTransactionQuery.mock.calls[1]).toContain('suspended');
    expect(transactionStatement(2)).toContain("status = 'verified'");
    expect(mockAudit).toHaveBeenCalledWith(mockSql, expect.objectContaining({
      action: 'professional_credential.suspended',
      metadata: { status: 'suspended', role: 'fitness_professional' },
    }));
  });
});
