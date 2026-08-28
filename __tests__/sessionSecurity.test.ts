import { requireAuth, requireUserAccess } from '../api/middleware/auth';
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
    const identity = { userId: 'user-1', email: 'user@example.com' };
    const token = await issueAccessToken(identity);
    await expect(verifyAccessToken(token)).resolves.toEqual(identity);
    await expect(verifyAccessToken(`${token}tampered`)).resolves.toBeNull();
  });

  it('requires a bearer token and rejects access to another user', async () => {
    const token = await issueAccessToken({ userId: 'user-1', email: 'user@example.com' });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = responseMock();

    await expect(requireAuth(req, res)).resolves.toEqual({
      userId: 'user-1',
      email: 'user@example.com',
    });
    await expect(requireUserAccess(req, res, 'user-2')).resolves.toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 401 when no token is present', async () => {
    const res = responseMock();
    await expect(requireAuth({ headers: {} } as any, res)).resolves.toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
