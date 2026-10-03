import { router } from 'expo-router';
import { Alert, Share } from 'react-native';

import { Card, ListRow, Muted, Screen, SectionHeader, Title } from '@/components/ui';
import { todayISO } from '@/lib/format';
import { useCurrentUser, useData, useStore } from '@/lib/store';

export default function SettingsScreen() {
  const user = useCurrentUser();
  const data = useData();
  const logout = useStore((s) => s.logout);

  const exportData = () =>
    Share.share({
      title: `FinPocket backup ${todayISO()}`,
      message: JSON.stringify({ app: 'FinPocket', exportedAt: new Date().toISOString(), data }, null, 2),
    });

  const comingSoon = (feature: string) => Alert.alert(feature, 'Fitur ini akan hadir setelah versi MVP.');

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
        <ListRow icon="🔁" title="Transaksi Berulang" subtitle="Segera hadir" onPress={() => comingSoon('Transaksi Berulang')} />
      </Card>

      <SectionHeader title="Aplikasi" />
      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="💱" title="Mata Uang" subtitle="Rupiah (IDR)" />
        <ListRow icon="🎨" title="Tema" subtitle="Terang" onPress={() => comingSoon('Tema Gelap')} />
        <ListRow icon="📤" title="Backup / Export Data" subtitle="Bagikan data sebagai JSON" onPress={exportData} />
      </Card>

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
      <Muted style={{ textAlign: 'center' }}>FinPocket v1.0.0</Muted>
    </Screen>
  );
}
