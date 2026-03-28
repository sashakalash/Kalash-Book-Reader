import '../global.css';

import { Stack } from 'expo-router';

/** Root layout — wraps all routes. Share intent handler will be added in Phase 3. */
export default function RootLayout() {
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
