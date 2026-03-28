import '../global.css';

import { Stack } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';

import { useDbMigrations } from '@/services/db/migrate';

/** Root layout — wraps all routes. Share intent handler will be added in Phase 3. */
export default function RootLayout() {
  const { success, error } = useDbMigrations();

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-8">
        <Text className="text-red-600 text-center">DB migration failed: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="reader/[bookId]"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
    </Stack>
  );
}
