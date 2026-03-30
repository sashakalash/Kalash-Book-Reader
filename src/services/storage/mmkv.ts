import { MMKV } from 'react-native-mmkv';

/**
 * MMKV instance for reading positions (hot path).
 * Uses mmap — kernel flushes pages to disk even on process kill.
 */
let positionStorage: MMKV | null = null;
export function getPositionStorage(): MMKV {
  if (!positionStorage) positionStorage = new MMKV({ id: 'reading-positions' });
  return positionStorage;
}

/** MMKV instance for user preferences (theme, font, etc.). */
let settingsStorage: MMKV | null = null;
export function getSettingsStorage(): MMKV {
  if (!settingsStorage) settingsStorage = new MMKV({ id: 'reader-settings' });
  return settingsStorage;
}
