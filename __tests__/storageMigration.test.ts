jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { purgeLegacyLocalData } from '../src/services/storage';

describe('plaintext storage migration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('removes health data, user identifiers and API caches from AsyncStorage', async () => {
    await AsyncStorage.multiSet([
      ['@ironplate_user_id', 'user-1'],
      ['@ironplate_user_profile', '{"weight":80}'],
      ['@ironplate_daily_logs', '[{"weight":80}]'],
      ['@ironplate_cache_weight_history_user', '[80]'],
      ['@unrelated_preference', 'dark'],
    ]);

    await purgeLegacyLocalData();

    await expect(AsyncStorage.getItem('@ironplate_user_id')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('@ironplate_user_profile')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('@ironplate_daily_logs')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('@ironplate_cache_weight_history_user')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('@unrelated_preference')).resolves.toBe('dark');
  });
});
