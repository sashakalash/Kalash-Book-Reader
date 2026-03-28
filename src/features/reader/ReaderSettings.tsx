import { Modal, Pressable, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/stores/settingsStore';
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

function FontFamilyButton({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: ReaderSettings['fontFamily'];
  active: boolean;
  onPress: (v: ReaderSettings['fontFamily']) => void;
}) {
  const fontFamilyMap: Record<ReaderSettings['fontFamily'], string | undefined> = {
    system: undefined,
    serif: 'Georgia',
    'sans-serif': 'Helvetica Neue',
  };
  return (
    <Pressable
      onPress={() => onPress(value)}
      accessibilityRole="button"
      accessibilityLabel={`${label} font`}
      accessibilityState={{ selected: active }}
      className={`flex-1 items-center rounded-xl border-2 py-3 ${
        active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
    >
      <Text
        style={{ fontFamily: fontFamilyMap[value] }}
        className={`text-base ${active ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ReaderSettingsProps {
  visible: boolean;
  onClose: () => void;
}

/** Bottom sheet for reader preferences. Changes are applied immediately via settingsStore. */
export function ReaderSettings({ visible, onClose }: ReaderSettingsProps) {
  const { settings, update } = useSettingsStore();

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
        {/* Handle */}
        <View className="mb-4 self-center h-1 w-10 rounded-full bg-gray-300" />

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

        {/* Font family */}
        <SectionLabel>Font</SectionLabel>
        <View className="mb-5 flex-row gap-2">
          <FontFamilyButton
            label="System"
            value="system"
            active={settings.fontFamily === 'system'}
            onPress={(v) => update({ fontFamily: v })}
          />
          <FontFamilyButton
            label="Serif"
            value="serif"
            active={settings.fontFamily === 'serif'}
            onPress={(v) => update({ fontFamily: v })}
          />
          <FontFamilyButton
            label="Sans"
            value="sans-serif"
            active={settings.fontFamily === 'sans-serif'}
            onPress={(v) => update({ fontFamily: v })}
          />
        </View>

        {/* Line spacing */}
        <SectionLabel>Line spacing</SectionLabel>
        <View className="mb-5 flex-row items-center gap-3">
          <Text className="text-xs text-gray-400">≡</Text>
          <Slider
            style={{ flex: 1, height: 32 }}
            minimumValue={1.0}
            maximumValue={2.0}
            step={0.1}
            value={settings.lineSpacing}
            onValueChange={(v) => update({ lineSpacing: Math.round(v * 10) / 10 })}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor="#3b82f6"
            accessibilityLabel="Line spacing"
            accessibilityRole="adjustable"
          />
          <Text className="w-8 text-center text-sm font-semibold text-gray-700">
            {settings.lineSpacing.toFixed(1)}
          </Text>
        </View>

        {/* Margins */}
        <SectionLabel>Margins</SectionLabel>
        <View className="flex-row items-center gap-3">
          <Text className="text-xs text-gray-400">|T|</Text>
          <Slider
            style={{ flex: 1, height: 32 }}
            minimumValue={0}
            maximumValue={48}
            step={4}
            value={settings.marginHorizontal}
            onValueChange={(v) => update({ marginHorizontal: v })}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor="#3b82f6"
            accessibilityLabel="Horizontal margins"
            accessibilityRole="adjustable"
          />
          <Text className="w-8 text-center text-sm font-semibold text-gray-700">
            {settings.marginHorizontal}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
