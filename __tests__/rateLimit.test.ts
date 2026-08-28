import {
  clearLoginFailures,
  enforceLoginLockout,
  rateLimit,
  recordLoginFailure,
} from '../api/middleware/rateLimit';

function responseMock() {
  const res: any = {
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function request(ip: string, email: string) {
  return {
    method: 'POST',
    url: '/api/users/auth?ignored=true',
    headers: { 'x-forwarded-for': ip },
    socket: {},
    body: { email },
  } as any;
}

describe('rate limit middleware', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-08-28T12:00:00Z')));
  afterEach(() => jest.useRealTimers());

  it('awaits the async handler and limits the same account across IPs', async () => {
    const limiter = rateLimit({
      maxRequests: 2,
      windowMs: 60_000,
      identity: req => req.body.email,
    });
    let completed = false;

    await limiter(request('10.0.0.1', 'user@example.com'), responseMock(), async () => {
      await Promise.resolve();
      completed = true;
    });
    expect(completed).toBe(true);

    await limiter(request('10.0.0.2', 'USER@example.com'), responseMock(), () => undefined);
    const blockedResponse = responseMock();
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await limiter(request('10.0.0.3', 'user@example.com'), blockedResponse, () => undefined);

    expect(blockedResponse.status).toHaveBeenCalledWith(429);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('rate_limit_exceeded'));
    expect(warning.mock.calls[0][0]).not.toContain('user@example.com');
    warning.mockRestore();
  });

  it('returns Retry-After while a progressive block is active', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const limiter = rateLimit({ maxRequests: 1, windowMs: 60_000 });
    await limiter(request('10.0.1.1', 'first@example.com'), responseMock(), () => undefined);
    await limiter(request('10.0.1.1', 'first@example.com'), responseMock(), () => undefined);

    const stillBlocked = responseMock();
    await limiter(request('10.0.1.1', 'first@example.com'), stillBlocked, () => undefined);
    expect(stillBlocked.status).toHaveBeenCalledWith(429);
    expect(stillBlocked.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    warning.mockRestore();
  });

  it('locks an account for 15 minutes after ten failed logins', () => {
    const req = request('10.0.2.1', 'locked@example.com');
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      recordLoginFailure(req, 'locked@example.com');
    }

    const res = responseMock();
    expect(enforceLoginLockout(req, res, 'locked@example.com')).toBe(true);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '900');
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('login_lockout'));

    clearLoginFailures(req, 'locked@example.com');
    expect(enforceLoginLockout(req, responseMock(), 'locked@example.com')).toBe(false);
    warning.mockRestore();
  });
});
