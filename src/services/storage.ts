import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_KEYS = new Set([
  '@ironplate_user_profile',
  '@ironplate_daily_logs',
  '@ironplate_meal_plans',
  '@ironplate_weight_history',
  '@ironplate_custom_foods',
  '@ironplate_user_id',
]);

/**
 * Removes the plaintext cache used before the API became the source of truth.
 * This is intentionally a migration-only helper; new health data must not be
 * persisted in AsyncStorage.
 */
export async function purgeLegacyLocalData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const sensitiveKeys = keys.filter(
    (key) => LEGACY_KEYS.has(key) || key.startsWith('@ironplate_cache_'),
  );

  if (sensitiveKeys.length > 0) {
    await AsyncStorage.multiRemove(sensitiveKeys);
  }
}
