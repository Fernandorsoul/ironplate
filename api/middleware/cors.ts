import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CORS middleware for the Vercel serverless functions.
 *
 * Allowed origins are echoed individually (never `*`) and `Vary: Origin`
 * is always emitted so intermediate caches do not mix per-origin responses.
 */

const DEFAULT_PRODUCTION_ORIGIN = 'https://ironplate.vercel.app';

/** Origins explicitly configured via ALLOWED_ORIGINS (comma-separated). */
function getConfiguredOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || DEFAULT_PRODUCTION_ORIGIN)
    .split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean);
}

/** True for http://localhost:<any port> and http://127.0.0.1:<any port>. */
function isLocalDevelopmentOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  return (
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  );
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  if (getConfiguredOrigins().includes(origin)) return true;

  // Outside production we also accept any localhost port, which covers the
  // Expo dev server (http://localhost:8081) and Expo web (http://localhost:19006).
  if (process.env.NODE_ENV !== 'production' && isLocalDevelopmentOrigin(origin)) {
    return true;
  }

  return false;
}

/**
 * Applies CORS headers for the given route.
 *
 * Handles the OPTIONS preflight itself (responds 204); in that case it
 * returns `true` and the caller must stop processing the request.
 * Returns `false` for regular requests so the caller continues.
 */
export function applyCors(
  req: VercelRequest,
  res: VercelResponse,
  allowedMethods: string[]
): boolean {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;

  res.setHeader('Vary', 'Origin');
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', [...allowedMethods, 'OPTIONS'].join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
