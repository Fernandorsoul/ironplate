import { createHash, randomBytes } from 'crypto';

export function createLinkInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashLinkInvitationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
