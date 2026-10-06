import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, Muted, Screen, SectionHeader, Segmented, useUiStyles } from '@/components/ui';
import { exportBackup, exportExcel, exportPdf, pickBackupFile, type ExportPeriod } from '@/lib/export';
import { monthPeriod } from '@/lib/finance';
import { monthLabel } from '@/lib/format';
import { useCurrentUser, useData, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function ExportScreen() {
  const ui = useUiStyles();
  const colors = useColors();
  const data = useData();
  const user = useCurrentUser();
  const restoreBackup = useStore((s) => s.restoreBackup);
  const now = new Date();
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [busy, setBusy] = useState<string | null>(null);

  const shift = (n: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const period: ExportPeriod =
    scope === 'all' ? null : { ...monthPeriod(cursor.y, cursor.m), label: monthLabel(cursor.y, cursor.m) };

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan.');
    } finally {
      setBusy(null);
    }
  };

  const restore = () =>
    run('restore', async () => {
      const json = await pickBackupFile();
      if (json === null) return;
      Alert.alert(
        'Pulihkan backup?',
        'Seluruh data akun ini akan diganti dengan isi file backup. Tindakan ini tidak bisa dibatalkan.',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Pulihkan',
            style: 'destructive',
            onPress: () => {
              const err = restoreBackup(json);
              Alert.alert(err ? 'Gagal' : 'Berhasil', err ?? 'Data berhasil dipulihkan dari backup.');
            },
          },
        ],
      );
    });

  const userName = user?.name ?? '';

  return (
    <Screen edges={['bottom']}>
      <SectionHeader title="Laporan" />
      <Card style={{ gap: 12 }}>
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: 'month', label: 'Per bulan' },
            { value: 'all', label: 'Semua waktu' },
          ]}
        />
        {scope === 'month' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => shift(-1)} hitSlop={12}>
              <Text style={{ fontSize: 30, color: colors.primary, paddingHorizontal: 12 }}>‹</Text>
            </Pressable>
            <Text style={[ui.listTitle, { fontSize: 17 }]}>{monthLabel(cursor.y, cursor.m)}</Text>
            <Pressable onPress={() => shift(1)} hitSlop={12}>
              <Text style={{ fontSize: 30, color: colors.primary, paddingHorizontal: 12 }}>›</Text>
            </Pressable>
          </View>
        )}
        <ExportButton
          title="📊 Export ke Excel (.xlsx)"
          busy={busy === 'excel'}
          disabled={busy !== null}
          onPress={() => run('excel', () => exportExcel(data, userName, period))}
        />
        <ExportButton
          title="📄 Export ke PDF"
          busy={busy === 'pdf'}
          disabled={busy !== null}
          variant="secondary"
          onPress={() => run('pdf', () => exportPdf(data, userName, period))}
        />
        <Muted>Berisi ringkasan, saldo Pocket, pengeluaran per kategori, dan seluruh riwayat transaksi.</Muted>
      </Card>

      <SectionHeader title="Backup Data" />
      <Card style={{ gap: 12 }}>
        <Muted>
          Data hanya tersimpan di HP ini. Simpan backup secara berkala (mis. ke Google Drive atau WhatsApp) agar data
          bisa dipulihkan jika aplikasi dihapus atau ganti HP.
        </Muted>
        <ExportButton
          title="💾 Simpan Backup (.json)"
          busy={busy === 'backup'}
          disabled={busy !== null}
          onPress={() => run('backup', () => exportBackup(data))}
        />
        <ExportButton
          title="♻️ Pulihkan dari Backup"
          busy={busy === 'restore'}
          disabled={busy !== null}
          variant="danger"
          onPress={restore}
        />
      </Card>
    </Screen>
  );
}

function ExportButton({
  title,
  busy,
  disabled,
  variant,
  onPress,
}: {
  title: string;
  busy: boolean;
  disabled: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
}) {
  const colors = useColors();
  if (busy) return <ActivityIndicator color={colors.primary} style={{ paddingVertical: 14 }} />;
  return <Button title={title} onPress={onPress} disabled={disabled} variant={variant} />;
}
