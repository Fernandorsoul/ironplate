import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'ironplate.session.v1';

export interface Session {
  userId: string;
  accessToken: string;
}
let webSession: string | null = null;

function serialize(session: Session): string {
  if (!session.userId || !session.accessToken) {
    throw new Error('Invalid session');
  }
  return JSON.stringify(session);
}

function deserialize(value: string | null): Session | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<Session>;
    if (typeof parsed.userId !== 'string' || typeof parsed.accessToken !== 'string') {
      return null;
    }
    if (!parsed.userId || !parsed.accessToken) return null;
    return { userId: parsed.userId, accessToken: parsed.accessToken };
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  const serialized = serialize(session);

  if (Platform.OS === 'web') {
    // SecureStore is unavailable on web. Keeping the token only in memory
    // prevents it from being persisted in localStorage where scripts can read it.
    webSession = serialized;
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, serialized, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadSession(): Promise<Session | null> {
  const serialized = Platform.OS === 'web'
    ? webSession
    : await SecureStore.getItemAsync(SESSION_KEY);
  const session = deserialize(serialized);

  if (!session && serialized) {
    await clearSession();
  }

  return session;
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    webSession = null;
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return (await loadSession())?.accessToken ?? null;
}
