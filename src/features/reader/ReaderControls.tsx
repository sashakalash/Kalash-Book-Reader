import { Pressable, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  if (!visible) return null;

  return (
    <View className="absolute inset-0 pointer-events-box-none">
      {/* Top bar */}
      <SafeAreaView edges={['top']} className="bg-white/95 px-4 shadow-sm">
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
      </SafeAreaView>

      {/* Spacer — tapping middle hides controls */}
      <View className="flex-1 pointer-events-none" />

      {/* Bottom scrubber */}
      <SafeAreaView edges={['bottom']} className="bg-white/95 px-4 shadow-sm">
        <View className="flex-row items-center gap-3 py-3">
          <Text className="w-10 text-xs text-gray-500 text-right">
            {Math.round(progress * 100)}%
          </Text>
          <Slider
            style={{ flex: 1, height: 32 }}
            minimumValue={0}
            maximumValue={1}
            value={progress}
            onSlidingComplete={onProgressChange}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor="#3b82f6"
            accessibilityLabel="Reading progress"
            accessibilityRole="adjustable"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
