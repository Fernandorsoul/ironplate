import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

// In-memory store (works for serverless with short-lived instances)
// For production, consider using Redis or Vercel KV
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware for Vercel serverless functions
 */
export function rateLimit(config: RateLimitConfig) {
  return async (req: VercelRequest, res: VercelResponse, next: () => void) => {
    // Get client IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.url}`;

    const now = Date.now();
    const record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      requestCounts.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
    } else {
      // Increment count
      record.count++;

      // Check if limit exceeded
      if (record.count > config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(429).json({
          error: config.message || 'Too many requests, please try again later',
          retryAfter,
        });
      }
    }

    // Set rate limit headers
    const currentRecord = requestCounts.get(key)!;
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - currentRecord.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(currentRecord.resetTime / 1000).toString());

    next();
  };
}

/**
 * Cleanup old entries to prevent memory leaks
 * Call this periodically in production
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many login attempts. Please try again in 1 minute.',
});

export const registerRateLimit = rateLimit({
  maxRequests: 3,
  windowMs: 10 * 60 * 1000, // 10 minutes
  message: 'Too many registration attempts. Please try again in 10 minutes.',
});

export const forgotPasswordRateLimit = rateLimit({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many password reset attempts. Please try again in 1 hour.',
});

export const resetPasswordRateLimit = rateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many password reset attempts. Please try again in 15 minutes.',
});

export const generalRateLimit = rateLimit({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many requests. Please try again later.',
});
