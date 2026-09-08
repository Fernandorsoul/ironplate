import { createLinkInvitationToken, hashLinkInvitationToken } from '../api/security/linkInvitation';

describe('professional invitation token security', () => {
  it('creates a 256-bit token and stores a deterministic one-way representation', () => {
    const token = createLinkInvitationToken();
    const hash = hashLinkInvitationToken(token);

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashLinkInvitationToken(token)).toBe(hash);
    expect(createLinkInvitationToken()).not.toBe(token);
  });
});
