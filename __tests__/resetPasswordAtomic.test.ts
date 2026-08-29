const mockSql = jest.fn();

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/rateLimit', () => ({
  forgotPasswordRateLimit: async (_req: unknown, _res: unknown, next: () => unknown) => next(),
  resetPasswordRateLimit: async (_req: unknown, _res: unknown, next: () => unknown) => next(),
}));
jest.mock('../api/security/password', () => ({
  hashPassword: async () => 'scrypt$test-salt$test-hash',
}));

import passwordResetHandler, { resetPasswordHandler } from '../api/users/password-reset';

function responseMock() {
  const response: any = {
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe('atomic password reset', () => {
  beforeEach(() => mockSql.mockReset());

  it('claims the token and updates the password in one database statement', async () => {
    mockSql.mockResolvedValue([{ id: 'user-1', invalidated_tokens: 0 }]);
    const response = responseMock();

    await resetPasswordHandler({
      method: 'POST',
      headers: {},
      socket: {},
      body: { token: 'a'.repeat(64), newPassword: 'NovaSenha123' },
    } as any, response);

    expect(mockSql).toHaveBeenCalledTimes(1);
    const statement = (mockSql.mock.calls[0][0] as TemplateStringsArray).join(' ');
    expect(statement).toContain('WITH claimed_token AS');
    expect(statement).toContain('AND expires_at > NOW()');
    expect(statement).toContain('UPDATE users');
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('rejects a token that could not be claimed', async () => {
    mockSql.mockResolvedValue([]);
    const response = responseMock();

    await resetPasswordHandler({
      method: 'POST',
      headers: {},
      socket: {},
      body: { token: 'b'.repeat(64), newPassword: 'NovaSenha123' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('routes the reset operation through the consolidated function', async () => {
    mockSql.mockResolvedValue([{ id: 'user-1', invalidated_tokens: 0 }]);
    const response = responseMock();

    await passwordResetHandler({
      method: 'POST',
      headers: {},
      socket: {},
      query: { operation: 'reset' },
      body: { token: 'c'.repeat(64), newPassword: 'NovaSenha123' },
    } as any, response);

    expect(mockSql).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('rejects calls to the internal function without an operation', async () => {
    const response = responseMock();

    await passwordResetHandler({ query: {} } as any, response);

    expect(mockSql).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(404);
  });
});
