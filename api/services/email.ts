interface PasswordResetEmail {
  to: string;
  name: string;
  resetUrl: string;
  token: string;
}

export class EmailConfigurationError extends Error {
  constructor() {
    super('RESEND_API_KEY and RESET_EMAIL_FROM must be configured');
    this.name = 'EmailConfigurationError';
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendPasswordResetEmail(message: PasswordResetEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESET_EMAIL_FROM;
  if (!apiKey || !from) throw new EmailConfigurationError();

  const name = escapeHtml(message.name);
  const resetUrl = escapeHtml(message.resetUrl);
  const token = escapeHtml(message.token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: 'Recuperação de senha — IronPlate',
      html: `
        <h1>Recuperação de senha</h1>
        <p>Olá, ${name}.</p>
        <p>Use o botão abaixo para continuar. O código expira em 15 minutos.</p>
        <p><a href="${resetUrl}">Redefinir minha senha</a></p>
        <p>Código de recuperação:</p>
        <p style="font-family: monospace; word-break: break-all">${token}</p>
        <p>Se você não solicitou a alteração, ignore esta mensagem.</p>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email provider rejected password reset request (${response.status})`);
  }
}
