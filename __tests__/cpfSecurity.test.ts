import { encryptCpf, hashCpfForLookup, isValidCpf, maskCpf, normalizeCpf } from '../api/security/cpf';
import fs from 'fs';
import path from 'path';

describe('protected CPF primitives', () => {
  beforeEach(() => {
    process.env.ADMIN_IDENTIFIER_INDEX_KEY = 'index-key-with-at-least-thirty-two-bytes';
    process.env.ADMIN_IDENTIFIER_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    process.env.ADMIN_IDENTIFIER_KEY_VERSION = 'v1';
  });

  it('normalizes and validates both CPF check digits', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('uses deterministic HMAC lookup and randomized authenticated encryption', () => {
    const first = encryptCpf('52998224725');
    const second = encryptCpf('52998224725');
    expect(hashCpfForLookup('52998224725')).toBe(hashCpfForLookup('529.982.247-25'));
    expect(first.encryptedValue).not.toContain('52998224725');
    expect(first.iv).not.toBe(second.iv);
    expect(first.tag).toBeTruthy();
  });

  it('never exposes more than the masked suffix', () => {
    expect(maskCpf('4725')).toBe('***.***.***-25');
  });

  it('migrates away unrecoverable legacy hashes and enforces unique keyed lookup', () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '0010_glamorous_sabretooth.sql'),
      'utf8',
    );
    const uniqueMigration = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '0011_gorgeous_monster_badoon.sql'),
      'utf8',
    );
    expect(migration).toContain('DELETE FROM "administrative_identifiers"');
    expect(migration).toContain('"encrypted_value" text NOT NULL');
    expect(uniqueMigration).toContain('CREATE UNIQUE INDEX "administrative_identifiers_hash_idx"');
  });
});
