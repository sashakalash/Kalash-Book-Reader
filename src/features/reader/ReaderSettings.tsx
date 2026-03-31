import { useRef } from 'react';
import { Modal, PanResponder, Pressable, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReaderSettings } from '@/types';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </Text>
  );
}

function ThemeButton({
  label,
  active,
  bg,
  textColor,
  onPress,
}: {
  label: string;
  active: boolean;
  bg: string;
  textColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} theme`}
      accessibilityState={{ selected: active }}
      className={`flex-1 items-center rounded-xl py-3 border-2 ${
        active ? 'border-blue-500' : 'border-transparent'
      }`}
      style={{ backgroundColor: bg }}
    >
      <Text style={{ color: textColor, fontWeight: active ? '700' : '400' }}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ReaderSettingsProps {
  visible: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdate: (patch: Partial<ReaderSettings>) => void;
}

/** Bottom sheet for reader preferences. Changes are applied immediately via MMKV. */
export function ReaderSettings({
  visible,
  onClose,
  settings,
  onUpdate: update,
}: ReaderSettingsProps) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 60) onClose();
      },
    }),
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <Pressable
        className="flex-1 bg-black/40"
        onPress={onClose}
        accessibilityLabel="Close settings"
        accessibilityRole="button"
      />

      {/* Sheet */}
      <SafeAreaView edges={['bottom']} className="rounded-t-2xl bg-white px-5 pt-3 pb-4">
        {/* Handle — drag down to close */}
        <View {...panResponder.panHandlers} className="mb-4 items-center py-2">
          <View className="h-1 w-10 rounded-full bg-gray-300" />
        </View>

        {/* Header */}
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-base font-bold text-gray-900">Reading settings</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="p-2 active:opacity-50"
          >
            <Text className="text-lg text-gray-400">✕</Text>
          </Pressable>
        </View>

        {/* Theme */}
        <SectionLabel>Theme</SectionLabel>
        <View className="mb-5 flex-row gap-2">
          <ThemeButton
            label="Day"
            bg="#ffffff"
            textColor="#1a1a1a"
            active={settings.theme === 'day'}
            onPress={() => update({ theme: 'day' })}
          />
          <ThemeButton
            label="Sepia"
            bg="#f5e6c8"
            textColor="#3b2d1e"
            active={settings.theme === 'sepia'}
            onPress={() => update({ theme: 'sepia' })}
          />
          <ThemeButton
            label="Night"
            bg="#1a1a1a"
            textColor="#e0e0e0"
            active={settings.theme === 'night'}
            onPress={() => update({ theme: 'night' })}
          />
        </View>

        {/* Font size */}
        <SectionLabel>Font size</SectionLabel>
        <View className="mb-5 flex-row items-center gap-3">
          <Text className="text-sm text-gray-400">A</Text>
          <Slider
            style={{ flex: 1, height: 32 }}
            minimumValue={12}
            maximumValue={24}
            step={1}
            value={settings.fontSize}
            onValueChange={(v) => update({ fontSize: v })}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor="#3b82f6"
            accessibilityLabel="Font size"
            accessibilityRole="adjustable"
          />
          <Text className="text-xl text-gray-400">A</Text>
          <Text className="w-8 text-center text-sm font-semibold text-gray-700">
            {settings.fontSize}
          </Text>
        </View>

        {/* Reading mode */}
        <SectionLabel>Reading mode</SectionLabel>
        <View className="mb-5 flex-row gap-2">
          <Pressable
            onPress={() => update({ flow: 'paginated' })}
            accessibilityRole="button"
            accessibilityLabel="Paginated mode"
            accessibilityState={{ selected: settings.flow === 'paginated' }}
            className={`flex-1 items-center rounded-xl border-2 py-3 ${
              settings.flow === 'paginated'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <Text
              className={`text-sm ${settings.flow === 'paginated' ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
            >
              Pages
            </Text>
          </Pressable>
          <Pressable
            onPress={() => update({ flow: 'scrolled-doc' })}
            accessibilityRole="button"
            accessibilityLabel="Scroll mode"
            accessibilityState={{ selected: settings.flow === 'scrolled-doc' }}
            className={`flex-1 items-center rounded-xl border-2 py-3 ${
              settings.flow === 'scrolled-doc'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <Text
              className={`text-sm ${settings.flow === 'scrolled-doc' ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
            >
              Scroll
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
