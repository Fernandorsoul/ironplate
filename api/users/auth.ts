import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import * as Crypto from 'crypto';
import { authRateLimit } from '../middleware/rateLimit';

const sql = neon(process.env.DATABASE_URL!);

const HASH_ITERATIONS = 10000;
const SALT_LENGTH = 32;

async function hashPassword(password: string, salt: string): Promise<string> {
  let hash = password + salt;
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash = Crypto.createHash('sha256').update(hash + salt).digest('hex');
  }
  return hash;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  await authRateLimit(req, res, async () => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const users = await sql`
        SELECT id, name, email, password_hash
        FROM users
        WHERE email = ${email.toLowerCase().trim()}
      `;

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      const [salt] = user.password_hash.split(':');
      const computedHash = await hashPassword(password, salt);

      if (user.password_hash !== `${salt}:${computedHash}`) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.status(200).json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
