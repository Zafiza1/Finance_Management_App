import { router } from 'expo-router';
import { Alert } from 'react-native';

import { Card, ListRow, Muted, Screen, SectionHeader, Segmented, Title } from '@/components/ui';
import { useCurrentUser, useData, useStore } from '@/lib/store';
import type { ThemePref } from '@/lib/theme';

export default function SettingsScreen() {
  const user = useCurrentUser();
  const data = useData();
  const logout = useStore((s) => s.logout);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const activeRecurring = data.recurring.filter((r) => r.active).length;
  const notifCount = [settings.dailyReminder, settings.budgetAlerts, settings.recurringAlerts].filter(Boolean).length;

  return (
    <Screen edges={['top']}>
      <Title>Pengaturan</Title>
      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="👤" title={user?.name ?? ''} subtitle={user?.email} onPress={() => router.push('/profile')} />
      </Card>

      <SectionHeader title="Keuangan" />
      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="👛" title="Pocket" subtitle="Tambah, edit, kunci Pocket" onPress={() => router.push('/pockets')} />
        <ListRow icon="🏷️" title="Kategori" onPress={() => router.push('/categories')} />
        <ListRow icon="📏" title="Budget" subtitle="Batas pengeluaran bulanan" onPress={() => router.push('/budgets')} />
        <ListRow icon="🧾" title="Riwayat Transaksi" onPress={() => router.push('/history')} />
        <ListRow
          icon="🔁"
          title="Transaksi Berulang"
          subtitle={activeRecurring > 0 ? `${activeRecurring} jadwal aktif` : 'Gaji, tagihan, langganan otomatis'}
          onPress={() => router.push('/recurring')}
        />
      </Card>

      <SectionHeader title="Aplikasi" />
      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="💱" title="Mata Uang" subtitle="Rupiah (IDR)" />
        <ListRow
          icon="🔔"
          title="Notifikasi"
          subtitle={notifCount > 0 ? `${notifCount} pengingat aktif` : 'Pengingat harian & peringatan budget'}
          onPress={() => router.push('/notifications')}
        />
        <ListRow
          icon="📤"
          title="Export & Backup"
          subtitle="Excel, PDF, backup & pulihkan data"
          onPress={() => router.push('/export')}
        />
      </Card>

      <SectionHeader title="Tema" />
      <Segmented<ThemePref>
        value={settings.theme}
        onChange={(theme) => setSettings({ theme })}
        options={[
          { value: 'system', label: 'Sistem' },
          { value: 'light', label: '☀️ Terang' },
          { value: 'dark', label: '🌙 Gelap' },
        ]}
      />

      <Card style={{ paddingVertical: 4 }}>
        <ListRow
          icon="🚪"
          title="Keluar"
          onPress={() =>
            Alert.alert('Keluar dari akun?', 'Data tetap tersimpan di perangkat ini.', [
              { text: 'Batal', style: 'cancel' },
              { text: 'Keluar', style: 'destructive', onPress: logout },
            ])
          }
        />
      </Card>
      <Muted style={{ textAlign: 'center' }}>
        FinPocket v1.0.0 · Semua data tersimpan offline di perangkat ini
      </Muted>
    </Screen>
  );
}
