import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Text, View } from 'react-native';

import { makeStyles, useColors } from '@/lib/theme';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
  };

export default function TabsLayout() {
  const s = useStyles();
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: icon('📊') }} />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View style={s.addButton}>
              <Text style={s.addText}>+</Text>
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/transaction/new');
          },
        }}
      />
      <Tabs.Screen name="goals" options={{ title: 'Goals', tabBarIcon: icon('🎯') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}

const useStyles = makeStyles((colors) => ({
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  addText: { color: '#fff', fontSize: 30, fontWeight: '400', marginTop: -2 },
}));
