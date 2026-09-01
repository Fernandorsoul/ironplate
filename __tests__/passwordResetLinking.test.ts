jest.mock('expo-linking', () => ({
  createURL: (path: string) => `ironplate://${path.replace(/^\//, '')}`,
}));

import { getPathFromState, getStateFromPath } from '@react-navigation/native';
import { passwordResetLinking } from '../src/navigation/linking';
import { isValidResetToken } from '../src/utils/passwordReset';

describe('password reset links', () => {
  const token = 'a'.repeat(64);

  it('maps the site root to PublicHome', () => {
    const state = getStateFromPath('/', passwordResetLinking.config);

    expect(state?.routes).toEqual([
      expect.objectContaining({ name: 'PublicHome' }),
    ]);
  });

  it('serializes PublicHome as the site root', () => {
    const path = getPathFromState(
      { routes: [{ name: 'PublicHome' }] },
      passwordResetLinking.config,
    );

    expect(path).toBe('/');
  });

  it('maps the reset URL to ForgotPassword with its token', () => {
    const state = getStateFromPath(
      `/reset-password?token=${token}`,
      passwordResetLinking.config,
    );

    expect(state?.routes).toEqual([
      expect.objectContaining({
        name: 'ForgotPassword',
        params: expect.objectContaining({ token }),
      }),
    ]);
  });

  it('accepts only complete 256-bit hexadecimal tokens', () => {
    expect(isValidResetToken(token)).toBe(true);
    expect(isValidResetToken(token.toUpperCase())).toBe(true);
    expect(isValidResetToken('a'.repeat(63))).toBe(false);
    expect(isValidResetToken(`${'a'.repeat(63)}z`)).toBe(false);
  });
});
