import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  SessionConfigurationError,
  type SessionIdentity,
  verifyAccessToken,
} from '../security/session';
import { getSql } from './db';

export type AuthenticatedRequest = VercelRequest & { auth?: SessionIdentity };

function readBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  return match?.[1] || null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: VercelResponse,
): Promise<SessionIdentity | null> {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  try {
    const identity = await verifyAccessToken(token);
    if (!identity) {
      res.status(401).json({ error: 'Invalid or expired access token' });
      return null;
    }

    // Reject tokens whose session_version no longer matches (password reset revokes).
    const sql = getSql();
    if (sql) {
      const rows = await sql`
        SELECT session_version FROM users WHERE id = ${identity.userId}
      `;
      const current = rows[0]?.session_version;
      const currentVersion = Number(current);
      const tokenVersion = Number(identity.sessionVersion);
      if (!Number.isFinite(currentVersion) || currentVersion !== tokenVersion) {
        res.status(401).json({ error: 'Invalid or expired access token' });
        return null;
      }
    }

    req.auth = identity;
    return identity;
  } catch (error) {
    if (error instanceof SessionConfigurationError) {
      res.status(500).json({ error: 'Authentication service not configured' });
      return null;
    }
    throw error;
  }
}

export async function requireUserAccess(
  req: AuthenticatedRequest,
  res: VercelResponse,
  requestedUserId: string,
): Promise<SessionIdentity | null> {
  const identity = req.auth || await requireAuth(req, res);
  if (!identity) return null;
  if (identity.userId !== requestedUserId) {
    res.status(403).json({ error: 'Access denied' });
    return null;
  }
  return identity;
}

export async function requireRole(
  req: AuthenticatedRequest,
  res: VercelResponse,
  sql: any,
  roles: readonly string[],
): Promise<SessionIdentity | null> {
  const identity = req.auth || await requireAuth(req, res);
  if (!identity) return null;
  const rows = await sql`
    SELECT role FROM user_roles
    WHERE user_id = ${identity.userId} AND role = ANY(${roles}) AND status = 'active'
    UNION ALL
    SELECT 'admin_verifier' AS role FROM users
    WHERE id = ${identity.userId} AND role = 'admin' AND 'admin_verifier' = ANY(${roles})
    LIMIT 1
  `;
  if (rows.length === 0) {
    res.status(403).json({ error: 'Insufficient role' });
    return null;
  }
  return identity;
}
