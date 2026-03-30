import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface ReaderControlsProps {
  title: string;
  progress: number; // 0–1
  onProgressChange: (value: number) => void;
  onTocPress: () => void;
  onSettingsPress: () => void;
  visible: boolean;
}

/**
 * Overlay controls shown/hidden by tapping the center of the reader.
 * Top bar: back, title, TOC, settings.
 * Bottom bar: progress scrubber + percentage.
 *
 * Uses useSafeAreaInsets() directly (not SafeAreaView) so insets are
 * stable across show/hide toggles and never jump off-screen.
 */
export function ReaderControls({
  title,
  progress,
  onProgressChange,
  onTocPress,
  onSettingsPress,
  visible,
}: ReaderControlsProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Local drag state — decoupled from reader progress while thumb is held.
  // pendingSeek holds the dragged-to value after release, preventing snap-back
  // to the stale progress until the reader catches up.
  const [dragging, setDragging] = useState(false);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const dragValue = useRef(progress);

  // Clear pendingSeek once the reader's progress catches up to the sought position
  useEffect(() => {
    if (pendingSeek !== null && Math.abs(progress - pendingSeek) < 0.02) {
      setPendingSeek(null);
    }
  }, [progress, pendingSeek]);

  if (!visible) return null;

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      {/* Top bar */}
      <View className="bg-white/95 px-4 shadow-sm" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center py-2 gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to library"
            className="p-2 -ml-2 active:opacity-50"
          >
            <Text className="text-2xl">‹</Text>
          </Pressable>

          <Text className="flex-1 text-sm font-semibold text-gray-900" numberOfLines={1}>
            {title}
          </Text>

          <Pressable
            onPress={onTocPress}
            accessibilityRole="button"
            accessibilityLabel="Table of contents"
            className="p-2 active:opacity-50"
          >
            <Text className="text-xl">☰</Text>
          </Pressable>

          <Pressable
            onPress={onSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="Reader settings"
            className="p-2 active:opacity-50"
          >
            <Text className="text-xl">⚙</Text>
          </Pressable>
        </View>
      </View>

      {/* Spacer — tapping middle passes through to WebView/PDF */}
      <View style={{ flex: 1 }} pointerEvents="none" />

      {/* Bottom scrubber */}
      <View className="bg-white/95 px-4 shadow-sm" style={{ paddingBottom: insets.bottom + 4 }}>
        <View className="flex-row items-center gap-3 py-3">
          <Text className="w-10 text-xs text-gray-500 text-right">
            {Math.round((dragging ? dragValue.current : (pendingSeek ?? progress)) * 100)}%
          </Text>
          <Slider
            style={{ flex: 1, height: 32 }}
            minimumValue={0}
            maximumValue={1}
            step={0.001}
            value={dragging ? dragValue.current : (pendingSeek ?? progress)}
            onValueChange={(v) => {
              dragValue.current = v;
              setDragging(true);
            }}
            onSlidingComplete={(v) => {
              dragValue.current = v;
              setPendingSeek(v);
              setDragging(false);
              onProgressChange(v);
            }}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor="#3b82f6"
            accessibilityLabel="Reading progress"
            accessibilityRole="adjustable"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          />
        </View>
      </View>
    </View>
  );
}
