import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  SessionConfigurationError,
  type SessionIdentity,
  verifyAccessToken,
} from '../security/session';

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
