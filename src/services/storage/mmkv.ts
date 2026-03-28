import { MMKV } from 'react-native-mmkv';

/**
 * MMKV instance for reading positions (hot path).
 * Uses mmap — kernel flushes pages to disk even on process kill.
 */
export const positionStorage = new MMKV({ id: 'reading-positions' });

/** MMKV instance for user preferences (theme, font, etc.). */
export const settingsStorage = new MMKV({ id: 'reader-settings' });
