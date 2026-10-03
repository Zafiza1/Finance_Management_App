import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Muted, Screen, styles as ui } from '@/components/ui';
import { AmountField } from '@/components/ui';
import { pocketBalance } from '@/lib/finance';
import { formatRp, todayISO } from '@/lib/format';
import { useBalances, useData, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function AllocateScreen() {
  const data = useData();
  const balances = useBalances();
  const allocate = useStore((s) => s.allocate);
  const pockets = data.pockets.filter((p) => !p.archived);
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const available = balances.unallocated;
  const total = Object.values(amounts).reduce((a, b) => a + b, 0);
  const remaining = available - total;
  const over = remaining < 0;

  const fillFromBudget = () => {
    const next: Record<string, number> = {};
    let left = available;
    for (const p of pockets) {
      const v = Math.min(p.budget, left);
      if (v > 0) next[p.id] = v;
      left -= Math.max(0, v);
    }
    setAmounts(next);
  };

  const save = () => {
    const err = allocate(
      Object.entries(amounts).map(([pocketId, amount]) => ({ pocketId, amount })),
      todayISO(),
    );
    if (err) return Alert.alert('Tidak dapat disimpan', err);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Card>
          <Muted>Saldo tersedia untuk dialokasikan</Muted>
          <Text style={s.big}>{formatRp(available)}</Text>
          <View style={s.row}>
            <Muted>Total alokasi</Muted>
            <Text style={s.value}>{formatRp(total)}</Text>
          </View>
          <View style={s.row}>
            <Muted>Sisa belum dialokasikan</Muted>
            <Text style={[s.value, over && { color: colors.expense }]}>{formatRp(remaining)}</Text>
          </View>
          {over && <Text style={s.error}>Jumlah alokasi melebihi saldo yang tersedia.</Text>}
        </Card>

        {available === 0 && (
          <Muted>Belum ada saldo yang perlu dibagi. Tambahkan pemasukan terlebih dahulu.</Muted>
        )}
        {pockets.some((p) => p.budget > 0) && (
          <Button title="Isi sesuai budget tiap Pocket" variant="secondary" onPress={fillFromBudget} />
        )}

        {pockets.map((p) => (
          <Card key={p.id} style={{ gap: 4 }}>
            <View style={s.row}>
              <Text style={ui.listTitle}>
                {p.icon} {p.name} {p.isLocked ? '🔒' : ''}
              </Text>
              <Muted>Saldo {formatRp(pocketBalance(balances, p.id))}</Muted>
            </View>
            <AmountField
              value={amounts[p.id] ?? 0}
              onChange={(n) => setAmounts((a) => ({ ...a, [p.id]: n }))}
            />
          </Card>
        ))}

        <Button title="Simpan Alokasi" onPress={save} disabled={over || total === 0} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  big: { fontSize: 28, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { fontWeight: '700', color: colors.text },
  error: { color: colors.expense, fontWeight: '700' },
});
