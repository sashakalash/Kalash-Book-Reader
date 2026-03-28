import { Pressable, Text, View } from 'react-native';

interface ImportFABProps {
  onPress: () => void;
  loading?: boolean;
}

/** Floating action button for importing books. Renders bottom-right. */
export function ImportFAB({ onPress, loading = false }: ImportFABProps) {
  return (
    <View className="absolute bottom-6 right-6">
      <Pressable
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Import book"
        className={`h-14 w-14 items-center justify-center rounded-full shadow-lg ${
          loading ? 'bg-blue-300' : 'bg-blue-500 active:bg-blue-600'
        }`}
      >
        <Text className="text-2xl text-white">{loading ? '⏳' : '+'}</Text>
      </Pressable>
    </View>
  );
}
