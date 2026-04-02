import { useState } from 'react';

import { getSettingsStorage } from '@/services/storage/mmkv';
import type { ReaderSettings } from '@/types';

const SETTINGS_KEY = 'reader-settings';

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'day',
  fontSize: 24,
  fontFamily: 'system',
  lineSpacing: 1.5,
  marginHorizontal: 16,
  flow: 'paginated',
};

function loadSettings(): ReaderSettings {
  const raw = getSettingsStorage().getString(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReaderSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Reader settings backed by MMKV. Call from the reader screen and pass down via props. */
export function useReaderSettings() {
  const [settings, setSettings] = useState(loadSettings);

  const update = (patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      getSettingsStorage().set(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { settings, update } as const;
}
