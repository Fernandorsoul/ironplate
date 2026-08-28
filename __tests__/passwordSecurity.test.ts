import { createHash } from 'crypto';
import { hashPassword, verifyPassword } from '../api/security/password';

function legacyHash(password: string, salt: string): string {
  let hash = password + salt;
  for (let index = 0; index < 10_000; index += 1) {
    hash = createHash('sha256').update(hash + salt).digest('hex');
  }
  return `${salt}:${hash}`;
}

describe('password hashing', () => {
  it('creates a versioned scrypt hash with a 16-byte salt', async () => {
    const stored = await hashPassword('SenhaSegura123');
    const [prefix, salt, key] = stored.split('$');

    expect(prefix).toBe('scrypt');
    expect(salt).toMatch(/^[a-f0-9]{32}$/);
    expect(key).toMatch(/^[a-f0-9]{128}$/);
  });

  it('verifies a current hash without requesting migration', async () => {
    const stored = await hashPassword('SenhaSegura123');
    await expect(verifyPassword('SenhaSegura123', stored)).resolves.toEqual({
      valid: true,
      needsRehash: false,
    });
    await expect(verifyPassword('senha-errada', stored)).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it('accepts the legacy hash and marks it for transparent migration', async () => {
    const stored = legacyHash('SenhaAntiga123', '0123456789abcdef0123456789abcdef');
    await expect(verifyPassword('SenhaAntiga123', stored)).resolves.toEqual({
      valid: true,
      needsRehash: true,
    });
  });

  it('rejects malformed hashes without throwing', async () => {
    await expect(verifyPassword('qualquer', 'not-a-valid-hash')).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
    await expect(verifyPassword('qualquer', 'scrypt$missing-key')).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
    await expect(verifyPassword('qualquer', 'scrypt$salt$not-hex')).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
    await expect(verifyPassword('qualquer', 'salt:hash:extra')).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it('rejects an incorrect password for a legacy hash without requesting migration', async () => {
    const stored = legacyHash('SenhaAntiga123', '0123456789abcdef0123456789abcdef');
    await expect(verifyPassword('SenhaErrada123', stored)).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
  });
});
