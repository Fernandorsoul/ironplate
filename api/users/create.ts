import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { registerRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { registerSchema, validationError } from '../middleware/validation';
import { hashPassword } from '../security/password';
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
  await registerRateLimit(req, res, async () => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return validationError(res, parsed.error.issues);
      }

      const { name, email, password } = parsed.data;
      const normalizedName = name.trim();
      const normalizedEmail = email.toLowerCase().trim();

      const id = randomUUID();
      const storedHash = await hashPassword(password);

      try {
        await sql`
          INSERT INTO users (id, name, email, password_hash)
          VALUES (${id}, ${normalizedName}, ${normalizedEmail}, ${storedHash})
        `;
        const accessToken = await issueAccessToken({ userId: id, email: normalizedEmail });
        return res.status(201).json({ id, name: normalizedName, email: normalizedEmail, accessToken });
      } catch (error: any) {
        if (error.message?.includes('duplicate key') || error.message?.includes('unique')) {
          return res.status(409).json({ error: 'Email already exists' });
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof SessionConfigurationError) {
        return res.status(500).json({ error: 'Authentication service not configured' });
      }
      console.error('Create user error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
