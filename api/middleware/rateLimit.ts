import { createHash } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
  maxBlockMs?: number;
  identity?: (req: VercelRequest) => string | null;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  blockedUntil: number;
  violations: number;
  lastSeen: number;
}

const requestCounts = new Map<string, RateLimitRecord>();
const loginFailures = new Map<string, {
  count: number;
  blockedUntil: number;
  lastFailure: number;
}>();

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0] || 'unknown';
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function routeName(req: VercelRequest): string {
  return (req.url || 'unknown').split('?')[0];
}

function anonymize(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function loginKeys(req: VercelRequest, email: string): string[] {
  return [
    `login:ip:${clientIp(req)}`,
    `login:account:${email.trim().toLowerCase()}`,
  ];
}

export function enforceLoginLockout(
  req: VercelRequest,
  res: VercelResponse,
  email: string,
): boolean {
  const now = Date.now();
  const blocked = loginKeys(req, email)
    .map(key => loginFailures.get(key))
    .find(record => record && record.blockedUntil > now);
  if (!blocked) return false;

  const retryAfter = Math.max(1, Math.ceil((blocked.blockedUntil - now) / 1000));
  res.setHeader('Retry-After', retryAfter.toString());
  res.status(429).json({
    error: 'Too many failed login attempts. Please try again later.',
    retryAfter,
  });
  return true;
}

export function recordLoginFailure(req: VercelRequest, email: string): void {
  const now = Date.now();
  for (const key of loginKeys(req, email)) {
    const previous = loginFailures.get(key);
    const record = !previous || now - previous.lastFailure > 60 * 60 * 1000
      ? { count: 0, blockedUntil: 0, lastFailure: now }
      : previous;
    record.count += 1;
    record.lastFailure = now;

    if (record.count >= 10) {
      const escalation = Math.floor((record.count - 10) / 5);
      const blockMs = Math.min(15 * 60 * 1000 * 2 ** escalation, 24 * 60 * 60 * 1000);
      record.blockedUntil = Math.max(record.blockedUntil, now + blockMs);
      console.warn(JSON.stringify({
        event: 'login_lockout',
        scope: key.includes(':account:') ? 'account' : 'ip',
        identifierHash: anonymize(key),
        failures: record.count,
        retryAfter: Math.ceil(blockMs / 1000),
      }));
    }
    loginFailures.set(key, record);
  }
}

export function clearLoginFailures(req: VercelRequest, email: string): void {
  for (const key of loginKeys(req, email)) loginFailures.delete(key);
}

function keysForRequest(req: VercelRequest, config: RateLimitConfig) {
  const route = routeName(req);
  const keys = [{ scope: 'ip', value: `${route}:ip:${clientIp(req)}` }];
  const identity = config.identity?.(req)?.trim().toLowerCase();
  if (identity) keys.push({ scope: 'account', value: `${route}:account:${identity}` });
  return keys;
}

function readRecord(key: string, now: number, windowMs: number): RateLimitRecord {
  const existing = requestCounts.get(key);
  if (!existing) {
    return { count: 0, resetTime: now + windowMs, blockedUntil: 0, violations: 0, lastSeen: now };
  }

  if (now > existing.resetTime && now > existing.blockedUntil) {
    existing.count = 0;
    existing.resetTime = now + windowMs;
    existing.violations = Math.max(0, existing.violations - 1);
  }
  existing.lastSeen = now;
  return existing;
}

export function rateLimit(config: RateLimitConfig) {
  return async (
    req: VercelRequest,
    res: VercelResponse,
    next: () => unknown | Promise<unknown>,
  ) => {
    const now = Date.now();
    const maxBlockMs = config.maxBlockMs ?? 24 * 60 * 60 * 1000;
    const records = keysForRequest(req, config).map(key => ({
      ...key,
      record: readRecord(key.value, now, config.windowMs),
    }));

    const blocked = records.find(({ record }) => now < record.blockedUntil);
    if (blocked) {
      const retryAfter = Math.max(1, Math.ceil((blocked.record.blockedUntil - now) / 1000));
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        error: config.message || 'Too many requests, please try again later',
        retryAfter,
      });
    }

    for (const item of records) {
      item.record.count += 1;
      requestCounts.set(item.value, item.record);
    }

    const exceeded = records.find(({ record }) => record.count > config.maxRequests);
    if (exceeded) {
      exceeded.record.violations += 1;
      const blockMs = Math.min(
        config.windowMs * 2 ** Math.max(0, exceeded.record.violations - 1),
        maxBlockMs,
      );
      exceeded.record.blockedUntil = now + blockMs;
      requestCounts.set(exceeded.value, exceeded.record);

      const retryAfter = Math.ceil(blockMs / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      console.warn(JSON.stringify({
        event: 'rate_limit_exceeded',
        route: routeName(req),
        method: req.method,
        scope: exceeded.scope,
        identifierHash: anonymize(exceeded.value),
        count: exceeded.record.count,
        limit: config.maxRequests,
        violations: exceeded.record.violations,
        retryAfter,
      }));
      return res.status(429).json({
        error: config.message || 'Too many requests, please try again later',
        retryAfter,
      });
    }

    const remaining = Math.min(...records.map(({ record }) => (
      Math.max(0, config.maxRequests - record.count)
    )));
    const resetTime = Math.max(...records.map(({ record }) => record.resetTime));
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

    return await next();
  };
}

export function cleanupRateLimitStore() {
  const expiry = Date.now() - 24 * 60 * 60 * 1000;
  for (const [key, record] of requestCounts.entries()) {
    if (record.lastSeen < expiry && record.blockedUntil < Date.now()) {
      requestCounts.delete(key);
    }
  }
  for (const [key, record] of loginFailures.entries()) {
    if (record.lastFailure < expiry && record.blockedUntil < Date.now()) {
      loginFailures.delete(key);
    }
  }
}

const requestEmail = (req: VercelRequest) => (
  typeof req.body?.email === 'string' ? req.body.email : null
);

export const authRateLimit = rateLimit({
  maxRequests: 5,
  windowMs: 60 * 1000,
  message: 'Too many login attempts. Please try again later.',
  identity: requestEmail,
});

export const registerRateLimit = rateLimit({
  maxRequests: 3,
  windowMs: 10 * 60 * 1000,
  message: 'Too many registration attempts. Please try again later.',
  identity: requestEmail,
});

export const forgotPasswordRateLimit = rateLimit({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000,
  message: 'Too many password reset attempts. Please try again later.',
  identity: requestEmail,
});

export const resetPasswordRateLimit = rateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
  message: 'Too many password reset attempts. Please try again later.',
});

export const generalRateLimit = rateLimit({
  maxRequests: 30,
  windowMs: 60 * 1000,
  message: 'Too many requests. Please try again later.',
  identity: req => typeof (req as any).auth?.userId === 'string'
    ? (req as any).auth.userId
    : null,
});
