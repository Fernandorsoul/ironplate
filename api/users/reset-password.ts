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

      const storedHash = await hashPassword(newPassword);

      // Claiming the token and changing the password happen in one statement.
      // A concurrent request can no longer reuse the same token between a
      // SELECT and a later UPDATE.
      const updatedUsers = await sql`
        WITH claimed_token AS (
          UPDATE password_reset_tokens
          SET used = TRUE
          WHERE token_hash = ${tokenHash}
            AND used = FALSE
            AND expires_at > NOW()
          RETURNING id, user_id
        ),
        updated_user AS (
          UPDATE users
          SET password_hash = ${storedHash}, updated_at = NOW()
          WHERE id IN (SELECT user_id FROM claimed_token)
          RETURNING id
        ),
        invalidated_tokens AS (
          UPDATE password_reset_tokens
          SET used = TRUE
          WHERE user_id IN (SELECT user_id FROM claimed_token)
            AND id NOT IN (SELECT id FROM claimed_token)
            AND used = FALSE
          RETURNING id
        )
        SELECT id, (SELECT COUNT(*) FROM invalidated_tokens) AS invalidated_tokens
        FROM updated_user
      `;

      if (updatedUsers.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

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
