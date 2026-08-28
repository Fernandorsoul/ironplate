import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetPasswordRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { resetPasswordSchema, validationError } from '../middleware/validation';
import { hashPassword } from '../security/password';
import { hashResetToken } from '../security/resetToken';

/**
 * POST /api/users/reset-password
 * 
 * Validates the reset token and updates the user's password.
 * Token is invalidated after use.
 */
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
  await resetPasswordRateLimit(req, res, async () => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return validationError(res, parsed.error.issues);
      }

      const { token, newPassword } = parsed.data;
      const tokenHash = hashResetToken(token);

      // Find valid token
      const tokens = await sql`
        SELECT id, user_id, expires_at, used 
        FROM password_reset_tokens 
        WHERE token_hash = ${tokenHash} AND used = FALSE
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

      const storedHash = await hashPassword(newPassword);

      await sql.transaction(txn => [
        txn`
          UPDATE users
          SET password_hash = ${storedHash}, updated_at = NOW()
          WHERE id = ${user.id}
        `,
        txn`
          UPDATE password_reset_tokens
          SET used = TRUE
          WHERE user_id = ${user.id} AND used = FALSE
        `,
      ]);

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
