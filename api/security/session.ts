import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

const ISSUER = 'ironplate-api';
const AUDIENCE = 'ironplate-app';
/** Short-lived access token; password reset bumps session_version to revoke. */
const ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export interface SessionIdentity {
  userId: string;
  email: string;
  sessionVersion: number;
}
interface TokenPayload {
  sub: string;
  email: string;
  iss: string;
  aud: string;
  jti: string;
  sv: number;
  iat: number;
  exp: number;
}

export class SessionConfigurationError extends Error {
  constructor() {
    super('JWT_SECRET must be configured with at least 32 characters');
    this.name = 'SessionConfigurationError';
  }
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new SessionConfigurationError();
  return secret;
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function signature(input: string): Buffer {
  return createHmac('sha256', getSecret()).update(input, 'ascii').digest();
}

export async function issueAccessToken(
  identity: Omit<SessionIdentity, 'sessionVersion'> & { sessionVersion?: number },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: identity.userId,
    email: identity.email,
    iss: ISSUER,
    aud: AUDIENCE,
    jti: randomUUID(),
    sv: identity.sessionVersion ?? 1,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  });
  const input = `${header}.${payload}`;
  return `${input}.${signature(input).toString('base64url')}`;
}

export async function verifyAccessToken(token: string): Promise<SessionIdentity | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !part)) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as {
      alg?: unknown;
      typ?: unknown;
    };
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;

    const provided = Buffer.from(encodedSignature, 'base64url');
    const expected = signature(`${encodedHeader}.${encodedPayload}`);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<TokenPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== 'string'
      || typeof payload.email !== 'string'
      || payload.iss !== ISSUER
      || payload.aud !== AUDIENCE
      || typeof payload.iat !== 'number'
      || typeof payload.exp !== 'number'
      || typeof payload.sv !== 'number'
      || payload.iat > now + 60
      || payload.exp <= now
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
      sessionVersion: payload.sv,
    };
  } catch (error) {
    if (error instanceof SessionConfigurationError) throw error;
    return null;
  }
}
