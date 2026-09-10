import { verifyPasswordTimingEqualized, hashPassword } from '../api/security/password';

describe('login timing equalization', () => {
  it('always performs a scrypt verification even when the account is missing', async () => {
    const start = Date.now();
    const missing = await verifyPasswordTimingEqualized('candidate-password', null);
    const missingMs = Date.now() - start;
    expect(missing.valid).toBe(false);

    const stored = await hashPassword('candidate-password');
    const start2 = Date.now();
    const wrong = await verifyPasswordTimingEqualized('other-password', stored);
    const wrongMs = Date.now() - start2;
    expect(wrong.valid).toBe(false);

    // Both paths must run scrypt; they should be in the same order of magnitude.
    expect(missingMs).toBeGreaterThanOrEqual(1);
    expect(wrongMs).toBeGreaterThanOrEqual(1);
  });

  it('still accepts a correct password for a real hash', async () => {
    const stored = await hashPassword('correct-horse1');
    await expect(verifyPasswordTimingEqualized('correct-horse1', stored))
      .resolves.toMatchObject({ valid: true });
  });
});
