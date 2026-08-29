jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { clearSession, getAccessToken, loadSession, saveSession } from '../src/services/session';

const session = { userId: 'user-1', accessToken: 'signed-token' };
const originalPlatform = Platform.OS;

describe('secure session storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  it('persists only the compact session in SecureStore on native platforms', async () => {
    await saveSession(session);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'ironplate.session.v1',
      JSON.stringify(session),
      { keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
    );
  });

  it('loads and clears a native session', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(session));
    await expect(loadSession()).resolves.toEqual(session);
    await expect(getAccessToken()).resolves.toBe('signed-token');

    await clearSession();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('ironplate.session.v1');
  });

  it('keeps the web session in memory instead of browser persistence', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    await saveSession(session);
    await expect(loadSession()).resolves.toEqual(session);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    await clearSession();
    await expect(loadSession()).resolves.toBeNull();
  });
});
