import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scryptCallback);

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEY_BYTES = 64;
const SALT_BYTES = 16;
const LEGACY_ITERATIONS = 10_000;

export interface PasswordVerification {
  valid: boolean;
  needsRehash: boolean;
}

async function deriveScryptKey(password: string, salt: string): Promise<Buffer> {
  return (await scryptAsync(password, salt, SCRYPT_KEY_BYTES)) as Buffer;
}

function safeEqualHex(expectedHex: string, actualHex: string): boolean {
  if (!/^[a-f0-9]+$/i.test(expectedHex) || !/^[a-f0-9]+$/i.test(actualHex)) {
    return false;
  }

  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Creates a versioned scrypt password hash with a 128-bit random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const key = await deriveScryptKey(password, salt);
  return `${SCRYPT_PREFIX}$${salt}$${key.toString('hex')}`;
}

function legacySha256Hash(password: string, salt: string): string {
  let hash = password + salt;
  for (let index = 0; index < LEGACY_ITERATIONS; index += 1) {
    hash = createHash('sha256').update(hash + salt).digest('hex');
  }
  return hash;
}

/**
 * Verifies both current scrypt hashes and the legacy salt:sha256 format.
 * Legacy matches are marked for transparent rehashing during login.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<PasswordVerification> {
  try {
    if (storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
      const [prefix, salt, expectedHex, extra] = storedHash.split('$');
      if (prefix !== SCRYPT_PREFIX || !salt || !expectedHex || extra !== undefined) {
        return { valid: false, needsRehash: false };
      }

      const actual = await deriveScryptKey(password, salt);
      return {
        valid: safeEqualHex(expectedHex, actual.toString('hex')),
        needsRehash: false,
      };
    }

    const [salt, expectedHex, extra] = storedHash.split(':');
    if (!salt || !expectedHex || extra !== undefined) {
      return { valid: false, needsRehash: false };
    }

    const actualHex = legacySha256Hash(password, salt);
    const valid = safeEqualHex(expectedHex, actualHex);
    return { valid, needsRehash: valid };
  } catch {
    return { valid: false, needsRehash: false };
  }
}
