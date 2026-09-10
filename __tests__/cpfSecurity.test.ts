import { encryptCpf, hashCpfForLookup, isValidCpf, lookupHashCandidates, maskCpf, normalizeCpf } from '../api/security/cpf';
import fs from 'fs';
import path from 'path';

describe('protected CPF primitives', () => {
  beforeEach(() => {
    process.env.ADMIN_IDENTIFIER_INDEX_KEY = 'index-key-with-at-least-thirty-two-bytes';
    process.env.ADMIN_IDENTIFIER_INDEX_KEY_VERSION = 'v1';
    delete process.env.ADMIN_IDENTIFIER_INDEX_KEY_PREVIOUS;
    delete process.env.ADMIN_IDENTIFIER_INDEX_KEY_PREVIOUS_VERSION;
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
    expect(hashCpfForLookup('52998224725').hash).toBe(hashCpfForLookup('529.982.247-25').hash);
    expect(hashCpfForLookup('52998224725').keyVersion).toBe('v1');
    expect(first.encryptedValue).not.toContain('52998224725');
    expect(first.iv).not.toBe(second.iv);
    expect(first.tag).toBeTruthy();
  });

  it('accepts the previous index key during rotation', () => {
    process.env.ADMIN_IDENTIFIER_INDEX_KEY = 'current-key-with-at-least-thirty-two-bytes';
    process.env.ADMIN_IDENTIFIER_INDEX_KEY_PREVIOUS = 'previous-key-with-at-least-thirty-two-b';
    process.env.ADMIN_IDENTIFIER_INDEX_KEY_PREVIOUS_VERSION = 'v0';
    const candidates = lookupHashCandidates('52998224725');
    expect(candidates).toHaveLength(2);
    expect(candidates[0].keyVersion).toBe('v1');
    expect(candidates[1].keyVersion).toBe('v0');
    expect(candidates[0].hash).not.toBe(candidates[1].hash);
  });

  it('never exposes more than the masked suffix', () => {
    expect(maskCpf('4725')).toBe('***.***.***-25');
  });

  it('versions the lookup index key column', () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '0014_index_key_version.sql'),
      'utf8',
    );
    expect(migration).toContain('value_hash_key_version');
  });
});
