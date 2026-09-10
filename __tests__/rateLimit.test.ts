import {
  clientIp,
  clearLoginFailures,
  enforceLoginLockout,
  rateLimit,
  recordLoginFailure,
} from '../api/middleware/rateLimit';
import { MemoryRateLimitStore, setRateLimitStore } from '../api/middleware/rateLimitStore';

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

function request(ip: string, email: string, headers: Record<string, string> = {}) {
  return {
    method: 'POST',
    url: '/api/users/auth?ignored=true',
    headers: { 'x-forwarded-for': ip, ...headers },
    socket: {},
    body: { email },
  } as any;
}

describe('rate limit middleware', () => {
  beforeEach(() => {
    setRateLimitStore(new MemoryRateLimitStore());
    jest.useFakeTimers().setSystemTime(new Date('2026-08-28T12:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('prefers x-real-ip over spoofable forwarded headers', () => {
    const req = request('spoofed.example', 'user@example.com', {
      'x-real-ip': '203.0.113.10',
      'x-forwarded-for': '1.2.3.4, 203.0.113.10',
    });
    expect(clientIp(req)).toBe('203.0.113.10');
  });

  it('uses the last forwarded hop when platform headers are absent', () => {
    const req = {
      method: 'POST',
      url: '/api/users/auth',
      headers: { 'x-forwarded-for': 'attacker, 203.0.113.20' },
      socket: {},
      body: {},
    } as any;
    expect(clientIp(req)).toBe('203.0.113.20');
  });

  it('awaits the async handler and limits the same account across IPs', async () => {
    const limiter = rateLimit({
      maxRequests: 2,
      windowMs: 60_000,
      identity: req => req.body.email,
    });
    let completed = false;

    await limiter(request('10.0.0.1', 'user@example.com', { 'x-real-ip': '10.0.0.1' }), responseMock(), async () => {
      await Promise.resolve();
      completed = true;
    });
    expect(completed).toBe(true);

    await limiter(request('10.0.0.2', 'USER@example.com', { 'x-real-ip': '10.0.0.2' }), responseMock(), () => undefined);
    const blockedResponse = responseMock();
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await limiter(request('10.0.0.3', 'user@example.com', { 'x-real-ip': '10.0.0.3' }), blockedResponse, () => undefined);

    expect(blockedResponse.status).toHaveBeenCalledWith(429);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('rate_limit_exceeded'));
    expect(warning.mock.calls[0][0]).not.toContain('user@example.com');
    warning.mockRestore();
  });

  it('returns Retry-After while a progressive block is active', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const limiter = rateLimit({ maxRequests: 1, windowMs: 60_000 });
    const req = request('10.0.1.1', 'first@example.com', { 'x-real-ip': '10.0.1.1' });
    await limiter(req, responseMock(), () => undefined);
    await limiter(req, responseMock(), () => undefined);

    const stillBlocked = responseMock();
    await limiter(req, stillBlocked, () => undefined);
    expect(stillBlocked.status).toHaveBeenCalledWith(429);
    expect(stillBlocked.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    warning.mockRestore();
  });

  it('locks an account for 15 minutes after ten failed logins', async () => {
    const req = request('10.0.2.1', 'locked@example.com', { 'x-real-ip': '10.0.2.1' });
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await recordLoginFailure(req, 'locked@example.com');
    }

    const res = responseMock();
    expect(await enforceLoginLockout(req, res, 'locked@example.com')).toBe(true);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '900');
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('login_lockout'));

    await clearLoginFailures(req, 'locked@example.com');
    expect(await enforceLoginLockout(req, responseMock(), 'locked@example.com')).toBe(false);
    warning.mockRestore();
  });
});
