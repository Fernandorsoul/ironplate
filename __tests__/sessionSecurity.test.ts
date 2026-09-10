import { requireAuth, requireRole, requireUserAccess } from '../api/middleware/auth';
import { issueAccessToken, verifyAccessToken } from '../api/security/session';

function responseMock() {
  const res: any = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('JWT session authorization', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('issues a signed token and verifies its identity', async () => {
    const identity = { userId: 'user-1', email: 'user@example.com', sessionVersion: 1 };
    const token = await issueAccessToken(identity);
    await expect(verifyAccessToken(token)).resolves.toEqual(identity);
    await expect(verifyAccessToken(`${token}tampered`)).resolves.toBeNull();
  });

  it('rejects tokens issued for a previous session version after password reset', async () => {
    const stale = await issueAccessToken({
      userId: 'user-1',
      email: 'user@example.com',
      sessionVersion: 1,
    });
    const fresh = await issueAccessToken({
      userId: 'user-1',
      email: 'user@example.com',
      sessionVersion: 2,
    });
    await expect(verifyAccessToken(stale)).resolves.toMatchObject({ sessionVersion: 1 });
    await expect(verifyAccessToken(fresh)).resolves.toMatchObject({ sessionVersion: 2 });
  });

  it('requires a bearer token and rejects access to another user', async () => {
    const token = await issueAccessToken({ userId: 'user-1', email: 'user@example.com' });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = responseMock();

    await expect(requireAuth(req, res)).resolves.toEqual({
      userId: 'user-1',
      email: 'user@example.com',
      sessionVersion: 1,
    });
    await expect(requireUserAccess(req, res, 'user-2')).resolves.toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 401 when no token is present', async () => {
    const res = responseMock();
    await expect(requireAuth({ headers: {} } as any, res)).resolves.toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts only active server-side roles', async () => {
    const req: any = { headers: {}, auth: { userId: 'user-1', email: 'user@example.com' } };
    const res = responseMock();
    const sql = jest.fn().mockResolvedValue([{ role: 'nutritionist' }]);

    await expect(requireRole(req, res, sql, ['nutritionist'])).resolves.toEqual(req.auth);
    const statement = (sql.mock.calls[0][0] as TemplateStringsArray).join(' ');
    expect(statement).toContain('FROM user_roles');
    expect(statement).toContain("status = 'active'");
    expect(sql.mock.calls[0]).toContain('user-1');
    expect(sql.mock.calls[0]).toContainEqual(['nutritionist']);
  });

  it('rejects missing roles without trusting request data', async () => {
    const req: any = {
      headers: {},
      auth: { userId: 'user-1', email: 'user@example.com' },
      body: { roles: ['admin_verifier'] },
    };
    const res = responseMock();
    const sql = jest.fn().mockResolvedValue([]);

    await expect(requireRole(req, res, sql, ['admin_verifier'])).resolves.toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient role' });
  });
});
