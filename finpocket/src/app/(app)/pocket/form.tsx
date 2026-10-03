import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AmountField, Button, Card, Field, Muted, Screen, styles as ui } from '@/components/ui';
import { POCKET_COLORS, POCKET_ICONS } from '@/lib/defaults';
import { useData, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function PocketFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useData();
  const { savePocket, deletePocket, setPocketArchived } = useStore();
  const existing = data.pockets.find((p) => p.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '💼');
  const [color, setColor] = useState(existing?.color ?? POCKET_COLORS[0]);
  const [budget, setBudget] = useState(existing?.budget ?? 0);
  const [isLocked, setLocked] = useState(existing?.isLocked ?? false);
  const [isSavings, setSavings] = useState(existing?.isSavings ?? false);

  const save = () => {
    const err = savePocket({ id: existing?.id, name, icon, color, budget, isLocked, isSavings });
    if (err) return Alert.alert('Tidak dapat disimpan', err);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(`Hapus ${existing.name}?`, 'Pocket yang memiliki riwayat akan diarsipkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          const delErr = deletePocket(existing.id);
          const err = delErr ? setPocketArchived(existing.id, true) : null;
          if (err) return Alert.alert('Tidak dapat dihapus', err);
          router.dismissTo('/pockets');
        },
      },
    ]);
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: existing ? 'Edit Pocket' : 'Tambah Pocket' }} />
      <View style={[s.preview, { backgroundColor: color }]}>
        <Text style={{ fontSize: 40 }}>{icon}</Text>
        <Text style={s.previewName}>{name || 'Nama Pocket'}</Text>
      </View>

      <Field label="Nama" value={name} onChangeText={setName} placeholder="Contoh: Modal Freelance" />
      <AmountField label="Budget bulanan (opsional)" value={budget} onChange={setBudget} />

      <Text style={ui.label}>Icon</Text>
      <View style={s.wrap}>
        {POCKET_ICONS.map((i) => (
          <Pressable key={i} onPress={() => setIcon(i)} style={[s.iconBox, icon === i && { borderColor: color }]}>
            <Text style={{ fontSize: 22 }}>{i}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Atau ketik emoji sendiri" value={icon} onChangeText={(t) => setIcon(t.trim().slice(0, 4) || '💼')} />

      <Text style={ui.label}>Warna</Text>
      <View style={s.wrap}>
        {POCKET_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[s.swatch, { backgroundColor: c }, color === c && s.swatchActive]}
          />
        ))}
      </View>

      <Card>
        <ToggleRow label="🔒 Kunci Pocket" hint="Butuh konfirmasi sebelum digunakan." value={isLocked} onChange={setLocked} />
        <ToggleRow
          label="💰 Pocket tabungan"
          hint="Tidak dihitung dalam batas pengeluaran harian."
          value={isSavings}
          onChange={setSavings}
        />
      </Card>

      <Button title="Simpan" onPress={save} />
      {existing && <Button title="Hapus Pocket" variant="danger" onPress={remove} />}
    </Screen>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={ui.listTitle}>{label}</Text>
        <Muted>{hint}</Muted>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

const s = StyleSheet.create({
  preview: { borderRadius: 20, padding: 20, alignItems: 'center', gap: 4 },
  previewName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchActive: { borderWidth: 3, borderColor: colors.text },
});
