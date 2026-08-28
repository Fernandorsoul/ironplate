import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as Crypto from 'crypto';
import { registerRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';

const HASH_ITERATIONS = 10000;
const SALT_LENGTH = 32;

function generateSalt(): string {
  return Crypto.randomBytes(SALT_LENGTH).toString('hex').substring(0, SALT_LENGTH);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  let hash = password + salt;
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash = Crypto.createHash('sha256').update(hash + salt).digest('hex');
  }
  return hash;
}

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
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create users table if not exists
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          age INTEGER,
          weight REAL,
          height REAL,
          gender TEXT DEFAULT 'male',
          activity_level TEXT DEFAULT 'moderate',
          goal TEXT DEFAULT 'maintenance',
          sport TEXT DEFAULT 'bodybuilding',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      const id = Crypto.randomUUID();
      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const storedHash = `${salt}:${passwordHash}`;

      try {
        await sql`
          INSERT INTO users (id, name, email, password_hash)
          VALUES (${id}, ${name.trim()}, ${email.toLowerCase().trim()}, ${storedHash})
        `;
        return res.status(201).json({ id, name: name.trim(), email: email.toLowerCase().trim() });
      } catch (error: any) {
        if (error.message?.includes('duplicate key') || error.message?.includes('unique')) {
          return res.status(409).json({ error: 'Email already exists' });
        }
        throw error;
      }
    } catch (error) {
      console.error('Create user error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
