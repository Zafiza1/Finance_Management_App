import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Switch, Text, View } from 'react-native';

import { ActivityRow } from '@/components/finance';
import { Button, Card, Empty, Muted, ProgressBar, Screen, SectionHeader } from '@/components/ui';
import { buildActivity, pocketBudgetStatus } from '@/lib/finance';
import { formatRp, todayISO } from '@/lib/format';
import { useBalances, useData, useStore } from '@/lib/store';
import { budgetColors, makeStyles, useColors } from '@/lib/theme';

export default function PocketDetailScreen() {
  const s = useStyles();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const balances = useBalances();
  const savePocket = useStore((s) => s.savePocket);
  const pocket = data.pockets.find((p) => p.id === id);

  const recent = useMemo(() => buildActivity(data).filter((a) => a.pocketIds.includes(id)).slice(0, 10), [data, id]);

  if (!pocket) return <Empty text="Pocket tidak ditemukan." />;
  const stats = balances.pockets[pocket.id];
  const budget = pocketBudgetStatus(data, pocket, todayISO());

  const toggleLock = (locked: boolean) => {
    const apply = () => {
      const err = savePocket({ ...pocket, isLocked: locked });
      if (err) Alert.alert('Gagal', err);
    };
    if (locked) return apply();
    Alert.alert(`Buka ${pocket.name}?`, `Apakah kamu yakin ingin menggunakan ${pocket.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Ya, Gunakan', onPress: apply },
    ]);
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: `${pocket.icon} ${pocket.name}` }} />

      <View style={[s.hero, { backgroundColor: pocket.color }]}>
        <Text style={s.heroLabel}>Saldo {pocket.isLocked ? '· 🔒 Locked' : ''}</Text>
        <Text style={s.heroAmount}>{formatRp(stats?.balance ?? 0)}</Text>
      </View>

      <Card>
        <StatRow label="Total alokasi" value={stats?.allocated ?? 0} />
        <StatRow label="Transfer masuk" value={stats?.transferIn ?? 0} />
        <StatRow label="Transfer keluar" value={-(stats?.transferOut ?? 0)} />
        <StatRow label="Total pengeluaran" value={-(stats?.expense ?? 0)} />
      </Card>

      {budget && (
        <Card>
          <View style={s.row}>
            <Text style={s.cardTitle}>Budget bulan ini</Text>
            <Text style={{ color: budgetColors[budget.level], fontWeight: '700' }}>{budget.label}</Text>
          </View>
          <ProgressBar pct={budget.pct} color={budgetColors[budget.level]} />
          <View style={s.row}>
            <Muted>Terpakai {formatRp(budget.spent)}</Muted>
            <Muted>{Math.round(budget.pct)}%</Muted>
          </View>
          <Muted>
            Budget {formatRp(budget.budget)} · Sisa {formatRp(Math.max(0, budget.remaining))}
          </Muted>
          {budget.message && <Text style={{ color: colors.expense, fontWeight: '600' }}>{budget.message}</Text>}
        </Card>
      )}

      <Card style={[s.row, { paddingVertical: 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>🔒 Kunci Pocket</Text>
          <Muted>Pocket terkunci butuh konfirmasi sebelum digunakan.</Muted>
        </View>
        <Switch value={pocket.isLocked} onValueChange={toggleLock} trackColor={{ true: colors.primary }} />
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          title="Pengeluaran"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'EXPENSE', pocketId: pocket.id } })}
        />
        <Button
          title="Transfer"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'TRANSFER', pocketId: pocket.id } })}
        />
      </View>
      <Button
        title="Edit Pocket"
        variant="ghost"
        onPress={() => router.push({ pathname: '/pocket/form', params: { id: pocket.id } })}
      />

      <SectionHeader
        title="Riwayat"
        action="Lihat semua"
        onAction={() => router.push({ pathname: '/history', params: { pocketId: pocket.id } })}
      />
      <Card style={{ paddingVertical: 4 }}>
        {recent.length === 0 ? <Empty text="Belum ada transaksi." /> : recent.map((a) => <ActivityRow key={a.id} item={a} />)}
      </Card>
    </Screen>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  const s = useStyles();
  const colors = useColors();
  return (
    <View style={s.row}>
      <Muted>{label}</Muted>
      <Text style={{ fontWeight: '700', color: value < 0 ? colors.expense : colors.text }}>{formatRp(value)}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { borderRadius: 20, padding: 20, gap: 4 },
  heroLabel: { color: '#ffffffcc', fontWeight: '600' },
  heroAmount: { color: '#fff', fontSize: 32, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
}));
