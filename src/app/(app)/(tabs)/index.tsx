import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityRow, GoalCard, PocketCard } from '@/components/finance';
import { Banner, Card, Empty, Muted, Screen, SectionHeader } from '@/components/ui';
import {
  buildActivity,
  currentMonthPeriod,
  dailyLimit,
  pocketBalance,
  pocketBudgetStatus,
  sumByType,
} from '@/lib/finance';
import { formatRp, monthLabel, parseISODate, todayISO } from '@/lib/format';
import { useBalances, useCurrentUser, useData } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function HomeScreen() {
  const data = useData();
  const balances = useBalances();
  const user = useCurrentUser();
  const today = todayISO();
  const now = parseISODate(today);

  const view = useMemo(() => {
    const period = currentMonthPeriod(today);
    const pockets = data.pockets.filter((p) => !p.archived);
    const budgets = pockets.map((p) => ({ pocket: p, status: pocketBudgetStatus(data, p, today) }));
    return {
      income: sumByType(data, 'INCOME', period),
      expense: sumByType(data, 'EXPENSE', period),
      budgets,
      alerts: budgets.filter((b) => b.status && ['near', 'done', 'over'].includes(b.status.level)),
      limit: dailyLimit(data, balances, today),
      recent: buildActivity(data).slice(0, 5),
    };
  }, [data, balances, today]);

  return (
    <Screen edges={['top']}>
      <View>
        <Muted>Halo, {user?.name ?? ''} 👋</Muted>
        <Text style={s.heading}>Keuangan {monthLabel(now.getFullYear(), now.getMonth())}</Text>
      </View>

      <View style={s.hero}>
        <Text style={s.heroLabel}>Total Saldo</Text>
        <Text style={s.heroAmount} adjustsFontSizeToFit numberOfLines={1}>
          {formatRp(balances.totalBalance)}
        </Text>
        <View style={s.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroLabel}>Pemasukan</Text>
            <Text style={s.heroSub}>+ {formatRp(view.income)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroLabel}>Pengeluaran</Text>
            <Text style={s.heroSub}>- {formatRp(view.expense)}</Text>
          </View>
        </View>
      </View>

      <View style={s.actions}>
        <QuickAction icon="➕" label="Pemasukan" onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'INCOME' } })} />
        <QuickAction icon="➖" label="Pengeluaran" onPress={() => router.push('/transaction/new')} />
        <QuickAction icon="🔁" label="Transfer" onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'TRANSFER' } })} />
        <QuickAction icon="📥" label="Alokasi" onPress={() => router.push('/allocate')} />
      </View>

      {balances.unallocated > 0 && (
        <Banner
          tone="info"
          text={`💡 ${formatRp(balances.unallocated)} belum dialokasikan. Ketuk untuk membagi ke Pocket →`}
          onPress={() => router.push('/allocate')}
        />
      )}
      {view.alerts.map(({ pocket, status }) => (
        <Banner
          key={pocket.id}
          tone={status!.level === 'near' ? 'warning' : 'danger'}
          text={status!.message ?? `${pocket.icon} Budget ${pocket.name}: ${status!.label} (${Math.round(status!.pct)}%)`}
          onPress={() => router.push({ pathname: '/pocket/[id]', params: { id: pocket.id } })}
        />
      ))}

      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Muted>Batas pengeluaran harian</Muted>
          <Text style={s.limit}>{formatRp(view.limit.perDay)} / hari</Text>
          <Muted>
            {formatRp(view.limit.spendable)} untuk {view.limit.daysLeft} hari tersisa
          </Muted>
        </View>
        <Text style={{ fontSize: 34 }}>📅</Text>
      </Card>

      <SectionHeader title="Pocket" action="Kelola" onAction={() => router.push('/pockets')} />
      <View style={s.grid}>
        {view.budgets.map(({ pocket, status }) => (
          <PocketCard key={pocket.id} pocket={pocket} balance={pocketBalance(balances, pocket.id)} budget={status} />
        ))}
      </View>

      <SectionHeader title="Target" action="Lihat semua" onAction={() => router.push('/goals')} />
      <Card>
        {data.goals.length === 0 ? (
          <Empty text="Belum ada target tabungan." />
        ) : (
          data.goals.slice(0, 2).map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              balances={balances}
              onPress={() => router.push({ pathname: '/goal/form', params: { id: g.id } })}
            />
          ))
        )}
      </Card>

      <SectionHeader title="Transaksi Terbaru" action="Lihat semua" onAction={() => router.push('/history')} />
      <Card style={{ paddingVertical: 6 }}>
        {view.recent.length === 0 ? (
          <Empty text="Belum ada transaksi. Tekan + untuk mulai mencatat." />
        ) : (
          view.recent.map((a) => <ActivityRow key={a.id} item={a} />)
        )}
      </Card>
    </Screen>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.action, pressed && { opacity: 0.6 }]}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={s.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: '800', color: colors.text },
  hero: { backgroundColor: colors.primary, borderRadius: 20, padding: 20, gap: 4 },
  heroLabel: { color: '#CCFBF1', fontSize: 13, fontWeight: '600' },
  heroAmount: { color: '#fff', fontSize: 34, fontWeight: '800' },
  heroRow: { flexDirection: 'row', marginTop: 12 },
  heroSub: { color: '#fff', fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: { fontSize: 11, fontWeight: '600', color: colors.text },
  limit: { fontSize: 22, fontWeight: '800', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
