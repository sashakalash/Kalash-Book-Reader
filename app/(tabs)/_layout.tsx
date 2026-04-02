import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/** Bottom tab navigator. */
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name="library"
              size={size}
              color={color}
              style={{ opacity: focused ? 1 : 0.5 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name="settings-sharp"
              size={size}
              color={color}
              style={{ opacity: focused ? 1 : 0.5 }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
