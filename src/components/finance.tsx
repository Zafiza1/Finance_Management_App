import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { ProgressBar, useUiStyles } from '@/components/ui';
import { pocketBalance, type Activity, type Balances, type BudgetStatus } from '@/lib/finance';
import { formatDate, formatPct, formatRp } from '@/lib/format';
import { useStore } from '@/lib/store';
import { budgetColors, makeStyles, radius, useColors, type ThemeColors } from '@/lib/theme';
import type { Goal, Pocket } from '@/lib/types';

export function PocketCard({
  pocket,
  balance,
  budget,
}: {
  pocket: Pocket;
  balance: number;
  budget: BudgetStatus | null;
}) {
  const s = useStyles();
  const ui = useUiStyles();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/pocket/[id]', params: { id: pocket.id } })}
      style={({ pressed }) => [s.pocketCard, { borderTopColor: pocket.color }, pressed && { opacity: 0.7 }]}
    >
      <View style={s.pocketHead}>
        <Text style={s.pocketIcon}>{pocket.icon}</Text>
        {pocket.isLocked && <Text style={s.lock}>🔒</Text>}
      </View>
      <Text style={s.pocketName} numberOfLines={1}>
        {pocket.name}
      </Text>
      <Text style={s.pocketBalance} numberOfLines={1} adjustsFontSizeToFit>
        {formatRp(balance)}
      </Text>
      {budget && (
        <View style={{ gap: 4, marginTop: 4 }}>
          <ProgressBar pct={budget.pct} color={budgetColors[budget.level]} />
          <Text style={[ui.muted, { fontSize: 11 }]} numberOfLines={1}>
            {formatRp(budget.spent)} / {formatRp(budget.budget)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Pocket picker that always shows the current balance, so the user knows what will be reduced. */
export function PocketPicker({
  pockets,
  balances,
  value,
  onChange,
  exclude,
}: {
  pockets: Pocket[];
  balances: Balances;
  value: string | null;
  onChange: (id: string) => void;
  exclude?: string | null;
}) {
  const s = useStyles();
  const ui = useUiStyles();
  return (
    <View style={s.pickerGrid}>
      {pockets
        .filter((p) => !p.archived && p.id !== exclude)
        .map((p) => {
          const selected = p.id === value;
          return (
            <Pressable
              key={p.id}
              onPress={() => onChange(p.id)}
              style={[s.pickerItem, selected && { borderColor: p.color, backgroundColor: `${p.color}18` }]}
            >
              <Text style={{ fontSize: 20 }}>{p.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.pickerName} numberOfLines={1}>
                  {p.name} {p.isLocked ? '🔒' : ''}
                </Text>
                <Text style={[ui.muted, { fontSize: 12 }]} numberOfLines={1}>
                  {formatRp(pocketBalance(balances, p.id))}
                </Text>
              </View>
            </Pressable>
          );
        })}
    </View>
  );
}

const kindStyle = (kind: Activity['kind'], colors: ThemeColors) =>
  ({
    INCOME: { sign: '+ ', color: colors.income, label: 'Pemasukan' },
    EXPENSE: { sign: '- ', color: colors.expense, label: 'Pengeluaran' },
    TRANSFER: { sign: '→ ', color: colors.transfer, label: 'Transfer' },
    ALLOCATION: { sign: '↘ ', color: colors.allocation, label: 'Alokasi' },
  })[kind];

export function ActivityRow({ item }: { item: Activity }) {
  const s = useStyles();
  const ui = useUiStyles();
  const k = kindStyle(item.kind, useColors());
  return (
    <Pressable onPress={() => showActivity(item, k)} style={({ pressed }) => [ui.listRow, pressed && { opacity: 0.6 }]}>
      <Text style={ui.listIcon}>{item.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={ui.listTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={ui.muted} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      <Text style={[s.amount, { color: k.color }]}>
        {k.sign}
        {formatRp(item.amount)}
      </Text>
    </Pressable>
  );
}

function showActivity(item: Activity, k: { sign: string; label: string }) {
  const lines = [`${k.label} · ${formatDate(item.date)}`, item.subtitle, item.note && `Catatan: ${item.note}`];
  Alert.alert(`${k.sign}${formatRp(item.amount)}`, lines.filter(Boolean).join('\n'), [
    { text: 'Tutup', style: 'cancel' },
    {
      text: 'Hapus',
      style: 'destructive',
      onPress: () =>
        Alert.alert('Hapus transaksi?', 'Saldo akan dihitung ulang otomatis.', [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: () => {
              const store = useStore.getState();
              const err =
                item.kind === 'TRANSFER' ? store.deleteTransfer(item.id) : store.deleteTransaction(item.id);
              if (err) Alert.alert('Gagal', err);
            },
          },
        ]),
    },
  ]);
}

export function goalProgress(goal: Goal, balances: Balances) {
  const current = goal.pocketId ? pocketBalance(balances, goal.pocketId) : goal.currentAmount;
  const pct = goal.targetAmount > 0 ? (current / goal.targetAmount) * 100 : 0;
  return { current, pct };
}

export function GoalCard({ goal, balances, onPress }: { goal: Goal; balances: Balances; onPress?: () => void }) {
  const { current, pct } = goalProgress(goal, balances);
  const ui = useUiStyles();
  const colors = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 22 }}>{goal.icon}</Text>
          <Text style={[ui.listTitle, { flex: 1 }]} numberOfLines={1}>
            {goal.name}
          </Text>
          <Text style={[ui.listTitle, { color: colors.primary }]}>{formatPct(Math.min(pct, 100))}</Text>
        </View>
        <ProgressBar pct={pct} color={pct >= 100 ? colors.income : colors.primary} />
        <Text style={ui.muted}>
          {formatRp(current)} / {formatRp(goal.targetAmount)}
          {goal.targetDate ? ` · ${formatDate(goal.targetDate)}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  pocketCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 14,
    borderTopWidth: 4,
    gap: 2,
  },
  pocketHead: { flexDirection: 'row', justifyContent: 'space-between' },
  pocketIcon: { fontSize: 24 },
  lock: { fontSize: 14 },
  pocketName: { fontSize: 13, color: colors.muted, fontWeight: '600', marginTop: 4 },
  pocketBalance: { fontSize: 17, fontWeight: '800', color: colors.text },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pickerName: { fontSize: 14, fontWeight: '600', color: colors.text },
  amount: { fontSize: 15, fontWeight: '700' },
}));
