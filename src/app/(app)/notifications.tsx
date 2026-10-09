import { Alert, Linking, Pressable, Switch, Text, View } from 'react-native';

import { Card, Muted, Screen, useUiStyles } from '@/components/ui';
import { ensurePermission, notificationsSupported } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import type { Settings } from '@/lib/types';

const pad = (n: number) => String(n).padStart(2, '0');
const formatTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const DAY = 24 * 60;

export default function NotificationsScreen() {
  const colors = useColors();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  /** Turning any notification on asks for permission first. */
  const toggle = async (key: 'dailyReminder' | 'budgetAlerts' | 'recurringAlerts', value: boolean) => {
    if (value && !notificationsSupported) {
      Alert.alert(
        'Notifikasi tidak tersedia',
        'Notifikasi tidak didukung di Expo Go (Android) atau web. Gunakan development build untuk mencobanya.',
      );
      return;
    }
    if (value && !(await ensurePermission())) {
      Alert.alert('Izin notifikasi ditolak', 'Aktifkan notifikasi untuk FinPocket di Pengaturan HP.', [
        { text: 'Nanti', style: 'cancel' },
        { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    setSettings({ [key]: value } as Partial<Settings>);
  };

  const shiftTime = (delta: number) =>
    setSettings({ reminderTime: (settings.reminderTime + delta + DAY) % DAY });

  return (
    <Screen edges={['bottom']}>
      <Muted>Semua notifikasi dijadwalkan langsung di HP, tetap berjalan tanpa internet.</Muted>

      <Card style={{ gap: 12 }}>
        <Row
          title="📝 Pengingat harian"
          hint="Ingatkan untuk mencatat transaksi setiap hari."
          value={settings.dailyReminder}
          onChange={(v) => toggle('dailyReminder', v)}
        />
        {settings.dailyReminder && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <TimeButton label="−30" onPress={() => shiftTime(-30)} />
            <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>{formatTime(settings.reminderTime)}</Text>
            <TimeButton label="+30" onPress={() => shiftTime(30)} />
          </View>
        )}
      </Card>

      <Card>
        <Row
          title="📏 Peringatan budget"
          hint="Kabari saat budget Pocket di atas 80%, habis, atau terlampaui."
          value={settings.budgetAlerts}
          onChange={(v) => toggle('budgetAlerts', v)}
        />
      </Card>

      <Card>
        <Row
          title="🔁 Transaksi berulang"
          hint="Kabari pukul 08.00 saat ada transaksi berulang yang jatuh tempo."
          value={settings.recurringAlerts}
          onChange={(v) => toggle('recurringAlerts', v)}
        />
      </Card>
    </Screen>
  );
}

function Row({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const ui = useUiStyles();
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={ui.listTitle}>{title}</Text>
        <Muted>{hint}</Muted>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

function TimeButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
