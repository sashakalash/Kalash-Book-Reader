import { create } from 'zustand';

import { getSettingsStorage } from '@/services/storage/mmkv';
import type { ReaderSettings } from '@/types';

const SETTINGS_KEY = 'reader-settings';

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'day',
  fontSize: 16,
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

interface SettingsState {
  settings: ReaderSettings;
  update: (patch: Partial<ReaderSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: loadSettings(),

  update: (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    getSettingsStorage().set(SETTINGS_KEY, JSON.stringify(next));
  },
}));
