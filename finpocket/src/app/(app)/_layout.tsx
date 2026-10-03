import { Stack } from 'expo-router';

import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="transaction/new" options={{ presentation: 'modal', title: 'Tambah Transaksi' }} />
      <Stack.Screen name="allocate" options={{ title: 'Bagi ke Pocket' }} />
      <Stack.Screen name="history" options={{ title: 'Riwayat Transaksi' }} />
      <Stack.Screen name="pockets" options={{ title: 'Kelola Pocket' }} />
      <Stack.Screen name="pocket/[id]" options={{ title: 'Pocket' }} />
      <Stack.Screen name="pocket/form" options={{ title: 'Pocket' }} />
      <Stack.Screen name="categories" options={{ title: 'Kategori' }} />
      <Stack.Screen name="budgets" options={{ title: 'Budget Bulanan' }} />
      <Stack.Screen name="goal/form" options={{ title: 'Target Tabungan' }} />
      <Stack.Screen name="profile" options={{ title: 'Profil' }} />
    </Stack>
  );
}
