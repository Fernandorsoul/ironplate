import { escapeHtml, EmailConfigurationError, sendPasswordResetEmail } from '../api/services/email';
import { hashResetToken } from '../api/security/resetToken';

describe('password reset delivery security', () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESET_EMAIL_FROM;

  afterEach(() => {
    process.env.RESEND_API_KEY = previousApiKey;
    process.env.RESET_EMAIL_FROM = previousFrom;
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
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    await sendPasswordResetEmail({
      to: 'user@example.com',
      name: '<b>User</b>',
      resetUrl: 'https://example.com/reset?token=abc&next=<bad>',
      token: 'a'.repeat(64),
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.html).toContain('&lt;b&gt;User&lt;/b&gt;');
    expect(body.html).not.toContain('<b>User</b>');
    expect(init.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer test-key' }));
  });

  it('fails closed when provider credentials are missing', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESET_EMAIL_FROM;
    await expect(sendPasswordResetEmail({
      to: 'user@example.com',
      name: 'User',
      resetUrl: 'https://example.com/reset',
      token: 'a'.repeat(64),
    })).rejects.toBeInstanceOf(EmailConfigurationError);
  });
});
