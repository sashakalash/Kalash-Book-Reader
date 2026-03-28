import { Tabs } from 'expo-router';

/** Bottom tab navigator. */
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
