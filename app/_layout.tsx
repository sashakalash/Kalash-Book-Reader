import '../global.css';

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';

import { useDbMigrations } from '@/services/db/migrate';
import { importBookFromUri } from '@/services/file/importer';

/** Root layout — initialises DB migrations and handles Share intent. */
export default function RootLayout() {
  const { success, error } = useDbMigrations();
  const router = useRouter();

  // Share intent — fires when app is opened via "Open With" from another app
  useEffect(() => {
    const handleSharedFiles = async (
      files: Array<{ contentUri?: string; filePath?: string; fileName?: string }>,
    ) => {
      for (const file of files) {
        const uri = file.contentUri ?? file.filePath;
        if (!uri) continue;
        try {
          const result = await importBookFromUri(uri, file.fileName ?? '');
          if (!result.alreadyExists) {
            router.push(`/reader/${result.bookId}`);
          }
        } catch (err) {
          console.error('Share import failed:', err);
        }
      }
    };

    ReceiveSharingIntent.getReceivedFiles(
      handleSharedFiles,
      (err: Error) => console.error('Share intent error:', err),
      'kalash-book-sharing',
    );

    return () => ReceiveSharingIntent.clearReceivedFiles();
  }, [router]);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack initialRouteName="(tabs)">
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="reader/[bookId]"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
