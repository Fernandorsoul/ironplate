interface PasswordResetEmail {
  to: string;
  name: string;
  token: string;
}

export class EmailConfigurationError extends Error {
  constructor() {
    super('RESEND_API_KEY, RESET_EMAIL_FROM, and a valid HTTPS APP_URL must be configured');
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
  const configuredAppUrl = process.env.APP_URL;
  if (!apiKey || !from || !configuredAppUrl) throw new EmailConfigurationError();

  let resetUrlValue: URL;
  try {
    const appUrl = new URL(configuredAppUrl);
    if (appUrl.protocol !== 'https:') throw new Error('APP_URL must use HTTPS');
    resetUrlValue = new URL('/reset-password', appUrl);
    resetUrlValue.searchParams.set('token', message.token);
  } catch {
    throw new EmailConfigurationError();
  }

  const name = escapeHtml(message.name);
  const resetUrl = escapeHtml(resetUrlValue.toString());
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
