import { randomBytes, randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { forgotPasswordRateLimit } from '../middleware/rateLimit';
import { forgotPasswordSchema } from '../middleware/validation';
import { hashResetToken } from '../security/resetToken';
import { sendPasswordResetEmail } from '../services/email';

const TOKEN_EXPIRATION_MS = 15 * 60 * 1000;
const GENERIC_RESPONSE = {
  success: true,
  message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação.',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      const appUrl = (process.env.APP_URL || 'https://ironplate.vercel.app').replace(/\/$/, '');
      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

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
          resetUrl,
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
