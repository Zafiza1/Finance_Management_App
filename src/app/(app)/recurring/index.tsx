import { router } from 'expo-router';
import { Alert, Switch, Text, View } from 'react-native';

import { Button, Card, Empty, Muted, Screen, SectionHeader, useUiStyles } from '@/components/ui';
import { FREQUENCY_LABEL, nextRecurringDate } from '@/lib/finance';
import { formatDate, formatRp, todayISO } from '@/lib/format';
import { useData, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import type { RecurringRule } from '@/lib/types';

export default function RecurringListScreen() {
  const data = useData();
  const ui = useUiStyles();
  const colors = useColors();
  const { setRecurringActive, runRecurring } = useStore();
  const today = todayISO();

  const runNow = () => {
    const { created, blocked } = runRecurring();
    Alert.alert(
      'Transaksi Berulang',
      created === 0 && blocked.length === 0
        ? 'Tidak ada transaksi yang jatuh tempo.'
        : [
            created > 0 ? `${created} transaksi dicatat.` : null,
            blocked.length > 0 ? `${blocked.length} jadwal tertunda karena saldo Pocket tidak mencukupi.` : null,
          ]
            .filter(Boolean)
            .join('\n'),
    );
  };

  const describe = (r: RecurringRule) => {
    const pocket = data.pockets.find((p) => p.id === r.pocketId);
    const category = data.categories.find((c) => c.id === r.categoryId);
    return {
      icon: category?.icon ?? (r.type === 'INCOME' ? '💵' : pocket?.icon ?? '💸'),
      title: r.note || category?.name || (r.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
      where: r.type === 'INCOME' ? 'Masuk ke saldo belum dialokasikan' : `Dari ${pocket ? `${pocket.icon} ${pocket.name}` : 'Pocket terhapus'}`,
    };
  };

  const income = data.recurring.filter((r) => r.type === 'INCOME');
  const expense = data.recurring.filter((r) => r.type === 'EXPENSE');

  const renderRule = (r: RecurringRule) => {
    const d = describe(r);
    const next = nextRecurringDate(r);
    const due = r.active && next !== null && next <= today;
    return (
      <Card key={r.id} style={{ gap: 4, opacity: r.active ? 1 : 0.6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>{d.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={ui.listTitle}
              numberOfLines={1}
              onPress={() => router.push({ pathname: '/recurring/form', params: { id: r.id } })}
            >
              {d.title}
            </Text>
            <Text style={[ui.listTitle, { color: r.type === 'INCOME' ? colors.income : colors.expense }]}>
              {r.type === 'INCOME' ? '+ ' : '- '}
              {formatRp(r.amount)} <Muted>/ {FREQUENCY_LABEL[r.frequency].toLowerCase()}</Muted>
            </Text>
          </View>
          <Switch
            value={r.active}
            onValueChange={(v) => void setRecurringActive(r.id, v)}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <Muted>{d.where}</Muted>
        <Muted style={due ? { color: colors.warning, fontWeight: '700' } : undefined}>
          {!r.active
            ? 'Dijeda'
            : next
              ? `${due ? 'Jatuh tempo' : 'Berikutnya'}: ${formatDate(next)}`
              : 'Jadwal sudah berakhir'}
          {r.occurrences > 0 ? ` · ${r.occurrences}x tercatat` : ''}
        </Muted>
        <Button
          title="Edit"
          variant="ghost"
          style={{ paddingVertical: 6 }}
          onPress={() => router.push({ pathname: '/recurring/form', params: { id: r.id } })}
        />
      </Card>
    );
  };

  return (
    <Screen edges={['bottom']}>
      <Muted>
        Transaksi dicatat otomatis setiap kali aplikasi dibuka pada atau setelah tanggal jatuh tempo — tanpa internet.
      </Muted>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="+ Jadwal Baru" onPress={() => router.push('/recurring/form')} style={{ flex: 1 }} />
        {data.recurring.length > 0 && (
          <Button title="Proses Sekarang" variant="secondary" onPress={runNow} style={{ flex: 1 }} />
        )}
      </View>

      {data.recurring.length === 0 && (
        <Card>
          <Empty text="Belum ada transaksi berulang. Contoh: Gaji bulanan, tagihan listrik, langganan internet." />
        </Card>
      )}
      {income.length > 0 && <SectionHeader title="Pemasukan" />}
      {income.map(renderRule)}
      {expense.length > 0 && <SectionHeader title="Pengeluaran" />}
      {expense.map(renderRule)}
    </Screen>
  );
}
