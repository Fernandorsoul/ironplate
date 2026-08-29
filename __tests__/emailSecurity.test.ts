import { escapeHtml, EmailConfigurationError, sendPasswordResetEmail } from '../api/services/email';
import { hashResetToken } from '../api/security/resetToken';

describe('password reset delivery security', () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESET_EMAIL_FROM;
  const previousAppUrl = process.env.APP_URL;

  afterEach(() => {
    process.env.RESEND_API_KEY = previousApiKey;
    process.env.RESET_EMAIL_FROM = previousFrom;
    process.env.APP_URL = previousAppUrl;
    jest.restoreAllMocks();
  });

  it('hashes reset tokens deterministically without storing the raw token', () => {
    const token = 'a'.repeat(64);
    expect(hashResetToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashResetToken(token)).not.toBe(token);
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it('escapes user-controlled email template values', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('sends the reset template through the configured provider', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESET_EMAIL_FROM = 'IronPlate <noreply@example.com>';
    process.env.APP_URL = 'https://ironplate-phi.vercel.app/';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    await sendPasswordResetEmail({
      to: 'user@example.com',
      name: '<b>User</b>',
      token: 'a'.repeat(64),
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.html).toContain('&lt;b&gt;User&lt;/b&gt;');
    expect(body.html).not.toContain('<b>User</b>');
    expect(body.html).toContain(
      `https://ironplate-phi.vercel.app/reset-password?token=${'a'.repeat(64)}`,
    );
    expect(init.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer test-key' }));
  });

  it('fails closed when provider credentials are missing', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESET_EMAIL_FROM;
    delete process.env.APP_URL;
    await expect(sendPasswordResetEmail({
      to: 'user@example.com',
      name: 'User',
      token: 'a'.repeat(64),
    })).rejects.toBeInstanceOf(EmailConfigurationError);
  });

  it('rejects a non-HTTPS app URL', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESET_EMAIL_FROM = 'IronPlate <noreply@example.com>';
    process.env.APP_URL = 'http://ironplate.example';

    await expect(sendPasswordResetEmail({
      to: 'user@example.com',
      name: 'User',
      token: 'a'.repeat(64),
    })).rejects.toBeInstanceOf(EmailConfigurationError);
  });
});
