import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startNotifications } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { applyThemePref, useColors, useIsDark } from '@/lib/theme';

export default function RootLayout() {
  const hydrated = useStore((s) => s.hydrated);
  const loggedIn = useStore((s) => s.sessionUserId !== null);
  const themePref = useStore((s) => s.settings.theme);
  const isDark = useIsDark();
  const colors = useColors();

  useEffect(() => {
    if (hydrated) applyThemePref(themePref);
  }, [hydrated, themePref]);

  useEffect(() => {
    if (hydrated) startNotifications();
  }, [hydrated]);

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [isDark, colors]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={!loggedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={loggedIn}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
