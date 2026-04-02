import { Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  onImport: () => void;
}

/** Shown when the library has no books yet. */
export function EmptyState({ onImport }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name="library-outline" size={64} color="#9ca3af" />
      <Text className="mt-4 text-xl font-bold text-gray-800">Your library is empty</Text>
      <Text className="mt-2 text-center text-sm text-gray-500">
        Import an EPUB or PDF to get started
      </Text>
      <Pressable
        onPress={onImport}
        accessibilityRole="button"
        accessibilityLabel="Add first book"
        className="mt-6 rounded-xl bg-blue-500 px-6 py-3 active:bg-blue-600"
      >
        <Text className="text-base font-semibold text-white">Add first book</Text>
      </Pressable>
    </View>
  );
}
