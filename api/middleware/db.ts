import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Returns a Neon SQL client, or null when DATABASE_URL is not configured.
 *
 * Handlers must call this at request time (never at module scope) so a
 * missing DATABASE_URL produces a graceful 500 instead of crashing the
 * function on cold start.
 */
export function getSql(): NeonQueryFunction<false, false> | null {
  const url = process.env.DATABASE_URL;
  return url ? neon(url) : null;
}
