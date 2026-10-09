import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';

import { formatRp } from '@/lib/format';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

/** Records due recurring transactions whenever the app is opened or brought back to the foreground. */
function useRecurringRunner() {
  useEffect(() => {
    const run = () => {
      const { created, blocked } = useStore.getState().runRecurring();
      if (created === 0 && blocked.length === 0) return;
      const lines: string[] = [];
      if (created > 0) lines.push(`${created} transaksi berulang telah dicatat otomatis.`);
      for (const r of blocked) {
        const label = r.note || (r.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran');
        lines.push(`⚠️ ${label} (${formatRp(r.amount)}) tertunda: saldo Pocket tidak mencukupi atau Pocket diarsipkan.`);
      }
      Alert.alert('Transaksi Berulang', lines.join('\n\n'), [
        { text: 'OK', style: 'cancel' },
        ...(blocked.length > 0 ? [{ text: 'Lihat', onPress: () => router.push('/recurring') }] : []),
      ]);
    };
    run();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && run());
    return () => sub.remove();
  }, []);
}

export default function AppLayout() {
  const colors = useColors();
  useRecurringRunner();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.card },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="transaction/new" options={{ presentation: 'modal', title: 'Tambah Transaksi' }} />
      <Stack.Screen name="transaction/[id]" options={{ title: 'Detail Pengeluaran' }} />
      <Stack.Screen name="allocate" options={{ title: 'Bagi ke Pocket' }} />
      <Stack.Screen name="history" options={{ title: 'Riwayat Transaksi' }} />
      <Stack.Screen name="pockets" options={{ title: 'Kelola Pocket' }} />
      <Stack.Screen name="pocket/[id]" options={{ title: 'Pocket' }} />
      <Stack.Screen name="pocket/form" options={{ title: 'Pocket' }} />
      <Stack.Screen name="categories" options={{ title: 'Kategori' }} />
      <Stack.Screen name="budgets" options={{ title: 'Budget Bulanan' }} />
      <Stack.Screen name="goal/form" options={{ title: 'Target Tabungan' }} />
      <Stack.Screen name="recurring/index" options={{ title: 'Transaksi Berulang' }} />
      <Stack.Screen name="recurring/form" options={{ title: 'Transaksi Berulang' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifikasi' }} />
      <Stack.Screen name="export" options={{ title: 'Export & Backup' }} />
      <Stack.Screen name="profile" options={{ title: 'Profil' }} />
      <Stack.Screen name="food-ai" options={{ title: 'Analisis Gizi' }} />
    </Stack>
  );
}
