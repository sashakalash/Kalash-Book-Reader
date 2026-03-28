import { useLocalSearchParams } from 'expo-router';
import { View, Text } from 'react-native';

/** Unified reader entry — delegates to EpubReader or PdfReader based on book format. */
export default function ReaderScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Text className="text-white">Reader for book {bookId} — Phase 5/6</Text>
    </View>
  );
}
