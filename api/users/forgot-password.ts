import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as Crypto from 'crypto';
import { forgotPasswordRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';

// Token expiration: 15 minutes
const TOKEN_EXPIRATION_MS = 15 * 60 * 1000;

/**
 * POST /api/users/forgot-password
 * 
 * Generates a password reset token and sends it via email.
 * Always returns success message to prevent email enumeration.
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

  // Apply rate limiting: 3 requests per hour per email
  await forgotPasswordRateLimit(req, res, async () => {
    try {
      const { email } = req.body;

      if (!email || !email.includes('@')) {
        // Return success anyway to prevent enumeration
        return res.status(200).json({
          success: true,
          message: 'Se o email estiver cadastrado, você receberá um link de recuperação.',
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists
      const users = await sql`
        SELECT id, name, email FROM users WHERE email = ${normalizedEmail}
      `;

      if (users.length === 0) {
        // Return success anyway to prevent enumeration
        return res.status(200).json({
          success: true,
          message: 'Se o email estiver cadastrado, você receberá um link de recuperação.',
        });
      }

      const user = users[0];

      // Generate secure token (256 bits of entropy)
      const token = Crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

      // Create password_reset_tokens table if not exists
      await sql`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Invalidate any existing tokens for this user
      await sql`
        UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ${user.id} AND used = FALSE
      `;

      // Store new token
      const tokenId = Crypto.randomUUID();
      await sql`
        INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
        VALUES (${tokenId}, ${user.id}, ${token}, ${expiresAt.toISOString()})
      `;

      // Send email with reset link
      // Note: In production, integrate with Resend, SendGrid, or AWS SES
      // For now, we'll log the token (remove in production)
      const resetUrl = `${process.env.APP_URL || 'https://ironplate.vercel.app'}/reset-password?token=${token}`;
      
      console.log(`[Password Reset] Token generated for user ${user.id}: ${resetUrl}`);
      
      // TODO: Integrate with email service
      // Example with Resend:
      // await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     from: 'noreply@ironplate.com',
      //     to: [user.email],
      //     subject: 'Recuperação de Senha - Ironplate',
      //     html: `
      //       <h1>Recuperação de Senha</h1>
      //       <p>Olá ${user.name},</p>
      //       <p>Você solicitou a recuperação de senha. Clique no link abaixo:</p>
      //       <a href="${resetUrl}">Recuperar Senha</a>
      //       <p>Este link expira em 15 minutos.</p>
      //       <p>Se você não solicitou isso, ignore este email.</p>
      //     `,
      //   }),
      // });

      return res.status(200).json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação.',
        // In development, return the token for testing
        ...(process.env.NODE_ENV === 'development' && { token, resetUrl }),
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
