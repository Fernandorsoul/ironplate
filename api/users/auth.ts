import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authRateLimit,
  clearLoginFailures,
  enforceLoginLockout,
  recordLoginFailure,
} from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { loginSchema, validationError } from '../middleware/validation';
import { hashPassword, verifyPassword } from '../security/password';
import { issueAccessToken, SessionConfigurationError } from '../security/session';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['POST'])) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getSql();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Apply rate limiting
  await authRateLimit(req, res, async () => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return validationError(res, parsed.error.issues);
      }

      const { email, password } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();
      if (enforceLoginLockout(req, res, normalizedEmail)) return;

      const users = await sql`
        SELECT id, name, email, password_hash
        FROM users
        WHERE email = ${normalizedEmail}
      `;

      if (users.length === 0) {
        recordLoginFailure(req, normalizedEmail);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      const verification = await verifyPassword(password, user.password_hash);

      if (!verification.valid) {
        recordLoginFailure(req, normalizedEmail);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      clearLoginFailures(req, normalizedEmail);

      if (verification.needsRehash) {
        const upgradedHash = await hashPassword(password);
        await sql`
          UPDATE users
          SET password_hash = ${upgradedHash}, updated_at = NOW()
          WHERE id = ${user.id}
        `;
      }

      try {
        await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
      } catch (error) {
        console.error('Update last login error:', error);
      }

      const accessToken = await issueAccessToken({ userId: user.id, email: user.email });
      return res.status(200).json({ id: user.id, name: user.name, email: user.email, accessToken });
    } catch (error) {
      if (error instanceof SessionConfigurationError) {
        return res.status(500).json({ error: 'Authentication service not configured' });
      }
      console.error('Auth error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
