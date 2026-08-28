import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import * as Crypto from 'crypto';
import { resetPasswordRateLimit } from '../middleware/rateLimit';

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

function generateSalt(): string {
  return Crypto.randomBytes(SALT_LENGTH).toString('hex').substring(0, SALT_LENGTH);
}

/**
 * POST /api/users/reset-password
 * 
 * Validates the reset token and updates the user's password.
 * Token is invalidated after use.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  await resetPasswordRateLimit(req, res, async () => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Find valid token
      const tokens = await sql`
        SELECT id, user_id, expires_at, used 
        FROM password_reset_tokens 
        WHERE token = ${token} AND used = FALSE
      `;

      if (tokens.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const tokenRecord = tokens[0];

      // Check expiration
      const expiresAt = new Date(tokenRecord.expires_at);
      if (expiresAt < new Date()) {
        // Mark as used even if expired
        await sql`
          UPDATE password_reset_tokens SET used = TRUE WHERE id = ${tokenRecord.id}
        `;
        return res.status(400).json({ error: 'Token expired' });
      }

      // Get user
      const users = await sql`
        SELECT id, email FROM users WHERE id = ${tokenRecord.user_id}
      `;

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];

      // Generate new password hash
      const salt = generateSalt();
      const passwordHash = await hashPassword(newPassword, salt);
      const storedHash = `${salt}:${passwordHash}`;

      // Update password
      await sql`
        UPDATE users SET password_hash = ${storedHash}, updated_at = NOW() WHERE id = ${user.id}
      `;

      // Mark token as used
      await sql`
        UPDATE password_reset_tokens SET used = TRUE WHERE id = ${tokenRecord.id}
      `;

      // Log successful reset
      console.log(`[Password Reset] Password reset successfully for user ${user.id} (${user.email})`);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
