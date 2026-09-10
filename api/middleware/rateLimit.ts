import { createHash } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRateLimitStore,
  type LoginFailureRecord,
  type RateLimitRecord,
  type RateLimitStore,
} from './rateLimitStore';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
  maxBlockMs?: number;
  identity?: (req: VercelRequest) => string | null;
}

/**
 * Prefer platform-set client IP headers. Vercel injects `x-real-ip` with the
 * true client address; the first `x-forwarded-for` hop is attacker-controlled
 * when the edge does not overwrite it, so it is only a last resort.
 */
export function clientIp(req: VercelRequest): string {
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  if (Array.isArray(realIp) && realIp[0]) return realIp[0].trim();

  const vercelForwarded = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelForwarded === 'string' && vercelForwarded.trim()) {
    return vercelForwarded.split(',')[0].trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[forwarded.length - 1].trim() || forwarded[0].trim();
  }
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const hops = forwarded.split(',').map(part => part.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return req.socket?.remoteAddress || 'unknown';
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

export async function enforceLoginLockout(
  req: VercelRequest,
  res: VercelResponse,
  email: string,
): Promise<boolean> {
  const now = Date.now();
  const store = getRateLimitStore();
  const records = await Promise.all(
    loginKeys(req, email).map(async key => store.getLoginFailure(key)),
  );
  const blocked = records.find(record => record && record.blockedUntil > now);
  if (!blocked) return false;

  const retryAfter = Math.max(1, Math.ceil((blocked.blockedUntil - now) / 1000));
  res.setHeader('Retry-After', retryAfter.toString());
  res.status(429).json({
    error: 'Too many failed login attempts. Please try again later.',
    retryAfter,
  });
  return true;
}

export async function recordLoginFailure(req: VercelRequest, email: string): Promise<void> {
  const now = Date.now();
  const store = getRateLimitStore();
  for (const key of loginKeys(req, email)) {
    const previous = await store.getLoginFailure(key);
    const record: LoginFailureRecord = !previous || now - previous.lastFailure > 60 * 60 * 1000
      ? { count: 0, blockedUntil: 0, lastFailure: now }
      : { ...previous };
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
    await store.setLoginFailure(key, record, 24 * 60 * 60 * 1000);
  }
}

export async function clearLoginFailures(req: VercelRequest, email: string): Promise<void> {
  const store = getRateLimitStore();
  await Promise.all(loginKeys(req, email).map(key => store.deleteLoginFailure(key)));
}

function keysForRequest(req: VercelRequest, config: RateLimitConfig) {
  const route = routeName(req);
  const keys = [{ scope: 'ip', value: `${route}:ip:${clientIp(req)}` }];
  const identity = config.identity?.(req)?.trim().toLowerCase();
  if (identity) keys.push({ scope: 'account', value: `${route}:account:${identity}` });
  return keys;
}

function emptyRecord(now: number, windowMs: number): RateLimitRecord {
  return { count: 0, resetTime: now + windowMs, blockedUntil: 0, violations: 0, lastSeen: now };
}

async function readRecord(
  key: string,
  now: number,
  windowMs: number,
): Promise<RateLimitRecord> {
  const store = getRateLimitStore();
  const existing = await store.getRecord(key);
  if (!existing) {
    return emptyRecord(now, windowMs);
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
    try {
      return await runRateLimit(config, req, res, next);
    } catch (error) {
      // Store/Upstash outages must not take down login or the API.
      console.error(JSON.stringify({
        event: 'rate_limit_store_error',
        message: error instanceof Error ? error.message : 'unknown',
      }));
      return await next();
    }
  };
}

async function runRateLimit(
  config: RateLimitConfig,
  req: VercelRequest,
  res: VercelResponse,
  next: () => unknown | Promise<unknown>,
) {
    const now = Date.now();
    const maxBlockMs = config.maxBlockMs ?? 24 * 60 * 60 * 1000;
    const store = getRateLimitStore();
    const requestKeys = keysForRequest(req, config);
    const records = await Promise.all(requestKeys.map(async key => ({
      ...key,
      record: await readRecord(key.value, now, config.windowMs),
    })));

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
      await store.setRecord(item.value, item.record, config.windowMs * 4);
    }

    const exceeded = records.find(({ record }) => record.count > config.maxRequests);
    if (exceeded) {
      exceeded.record.violations += 1;
      const blockMs = Math.min(
        config.windowMs * 2 ** Math.max(0, exceeded.record.violations - 1),
        maxBlockMs,
      );
      exceeded.record.blockedUntil = now + blockMs;
      await store.setRecord(exceeded.value, exceeded.record, Math.max(blockMs, config.windowMs) * 2);

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
}

export function cleanupRateLimitStore() {
  const store = getRateLimitStore() as RateLimitStore & { cleanup?: () => void };
  if (typeof store.cleanup === 'function') {
    store.cleanup();
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
