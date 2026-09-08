import { createCipheriv, createHmac, randomBytes } from 'crypto';

export function normalizeCpf(value: string): string {
  return value.replace(/[.-]/g, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let position = 9; position <= 10; position += 1) {
    let sum = 0;
    for (let index = 0; index < position; index += 1) {
      sum += Number(cpf[index]) * (position + 1 - index);
    }
    const digit = (sum * 10) % 11 % 10;
    if (digit !== Number(cpf[position])) return false;
  }
  return true;
}

function readEncryptionKey(): Buffer {
  const configured = process.env.ADMIN_IDENTIFIER_ENCRYPTION_KEY;
  if (!configured) throw new Error('ADMIN_IDENTIFIER_ENCRYPTION_KEY is not configured');
  const key = /^[a-f0-9]{64}$/i.test(configured)
    ? Buffer.from(configured, 'hex')
    : Buffer.from(configured, 'base64');
  if (key.length !== 32) throw new Error('ADMIN_IDENTIFIER_ENCRYPTION_KEY must contain 32 bytes');
  return key;
}

export function hashCpfForLookup(cpf: string): string {
  const key = process.env.ADMIN_IDENTIFIER_INDEX_KEY;
  if (!key || key.length < 32) throw new Error('ADMIN_IDENTIFIER_INDEX_KEY is not configured');
  return createHmac('sha256', key).update(normalizeCpf(cpf)).digest('hex');
}

export function encryptCpf(cpf: string): { encryptedValue: string; iv: string; tag: string; keyVersion: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', readEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalizeCpf(cpf), 'utf8'), cipher.final()]);
  return {
    encryptedValue: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    keyVersion: process.env.ADMIN_IDENTIFIER_KEY_VERSION || 'v1',
  };
}

export function maskCpf(lastFour: string): string {
  return `***.***.***-${lastFour.slice(-2)}`;
}
