import { randomBytes, randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import {
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
} from '../middleware/rateLimit';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  validationError,
} from '../middleware/validation';
import { hashPassword } from '../security/password';
import { hashResetToken } from '../security/resetToken';
import { sendPasswordResetEmail } from '../services/email';

const TOKEN_EXPIRATION_MS = 15 * 60 * 1000;
const GENERIC_RESPONSE = {
  success: true,
  message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação.',
};

export async function forgotPasswordHandler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['POST'])) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  await forgotPasswordRateLimit(req, res, async () => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(200).json(GENERIC_RESPONSE);

      const normalizedEmail = parsed.data.email.toLowerCase().trim();
      const users = await sql`
        SELECT id, name, email FROM users WHERE email = ${normalizedEmail}
      `;
      if (users.length === 0) return res.status(200).json(GENERIC_RESPONSE);

      const user = users[0];
      const token = randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(token);
      const tokenId = randomUUID();
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

      await sql.transaction(txn => [
        txn`
          UPDATE password_reset_tokens
          SET used = TRUE
          WHERE user_id = ${user.id} AND used = FALSE
        `,
        txn`
          INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
          VALUES (${tokenId}, ${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
        `,
      ]);

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          token,
        });
      } catch (error) {
        await sql`UPDATE password_reset_tokens SET used = TRUE WHERE id = ${tokenId}`;
        console.error(JSON.stringify({
          event: 'password_reset_email_failed',
          tokenId,
          error: error instanceof Error ? error.name : 'UnknownError',
        }));
      }

      return res.status(200).json(GENERIC_RESPONSE);
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}

export async function resetPasswordHandler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['POST'])) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getSql();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  await resetPasswordRateLimit(req, res, async () => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return validationError(res, parsed.error.issues);
      }

      const { token, newPassword } = parsed.data;
      const tokenHash = hashResetToken(token);
      const storedHash = await hashPassword(newPassword);

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const operation = Array.isArray(req.query.operation)
    ? req.query.operation[0]
    : req.query.operation;

  if (operation === 'forgot') return forgotPasswordHandler(req, res);
  if (operation === 'reset') return resetPasswordHandler(req, res);

  return res.status(404).json({ error: 'Not found' });
}
