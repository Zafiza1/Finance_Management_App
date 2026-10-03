import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Empty, Muted, ProgressBar, Screen, SectionHeader, Title } from '@/components/ui';
import {
  buildInsights,
  expenseByCategory,
  expenseByPocket,
  monthPeriod,
  pocketBalance,
  sumByType,
  type Slice,
} from '@/lib/finance';
import { formatRp, monthLabel, parseISODate, todayISO } from '@/lib/format';
import { useBalances, useData } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function ReportsScreen() {
  const data = useData();
  const balances = useBalances();
  const today = todayISO();
  const now = parseISODate(today);
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const shift = (n: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const report = useMemo(() => {
    const period = monthPeriod(cursor.y, cursor.m);
    const income = sumByType(data, 'INCOME', period);
    const expense = sumByType(data, 'EXPENSE', period);
    const savings = data.pockets
      .filter((p) => p.isSavings && !p.archived)
      .reduce((sum, p) => sum + pocketBalance(balances, p.id), 0);
    return {
      income,
      expense,
      savings,
      net: income - expense,
      byCategory: expenseByCategory(data, period),
      byPocket: expenseByPocket(data, period),
      insights: buildInsights(data, cursor.y, cursor.m, today),
    };
  }, [data, balances, cursor, today]);

  const maxFlow = Math.max(report.income, report.expense, 1);

  return (
    <Screen edges={['top']}>
      <Title>Laporan</Title>
      <View style={s.monthRow}>
        <Pressable onPress={() => shift(-1)} hitSlop={12}>
          <Text style={s.arrow}>‹</Text>
        </Pressable>
        <Text style={s.month}>{monthLabel(cursor.y, cursor.m)}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={12}>
          <Text style={s.arrow}>›</Text>
        </Pressable>
      </View>

      <View style={s.grid}>
        <Stat label="Pemasukan" value={report.income} color={colors.income} />
        <Stat label="Pengeluaran" value={report.expense} color={colors.expense} />
        <Stat label="Tabungan" value={report.savings} color={colors.primary} />
        <Stat label="Sisa" value={report.net} color={report.net < 0 ? colors.expense : colors.text} />
      </View>

      <Card>
        <Text style={s.cardTitle}>Pemasukan vs Pengeluaran</Text>
        <Muted>Pemasukan</Muted>
        <ProgressBar pct={(report.income / maxFlow) * 100} color={colors.income} />
        <Muted>Pengeluaran</Muted>
        <ProgressBar pct={(report.expense / maxFlow) * 100} color={colors.expense} />
      </Card>

      <SectionHeader title="Insight" />
      <Card>
        {report.insights.length === 0 ? (
          <Empty text="Belum cukup data untuk insight bulan ini." />
        ) : (
          report.insights.map((t, i) => (
            <Text key={i} style={s.insight}>
              💡 {t}
            </Text>
          ))
        )}
      </Card>

      <SectionHeader title="Pengeluaran per Kategori" />
      <Breakdown slices={report.byCategory} total={report.expense} />

      <SectionHeader title="Pengeluaran per Pocket" />
      <Breakdown slices={report.byPocket} total={report.expense} />
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={s.stat}>
      <Muted>{label}</Muted>
      <Text style={[s.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatRp(value)}
      </Text>
    </Card>
  );
}

function Breakdown({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <Card>
      {slices.length === 0 ? (
        <Empty text="Tidak ada pengeluaran." />
      ) : (
        slices.map((sl) => {
          const pct = total > 0 ? (sl.amount / total) * 100 : 0;
          return (
            <View key={sl.id} style={{ gap: 4, marginBottom: 6 }}>
              <View style={s.sliceRow}>
                <Text style={s.sliceName}>
                  {sl.icon} {sl.name}
                </Text>
                <Text style={s.sliceAmount}>
                  {formatRp(sl.amount)} <Text style={s.slicePct}>· {Math.round(pct)}%</Text>
                </Text>
              </View>
              <ProgressBar pct={pct} color={sl.color} />
            </View>
          );
        })
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { fontSize: 30, color: colors.primary, paddingHorizontal: 12 },
  month: { fontSize: 17, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  cardTitle: { fontWeight: '700', color: colors.text },
  insight: { color: colors.text, lineHeight: 20 },
  sliceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sliceName: { fontWeight: '600', color: colors.text },
  sliceAmount: { fontWeight: '700', color: colors.text },
  slicePct: { color: colors.muted, fontWeight: '500' },
});
