import { router } from 'expo-router';
import { Text } from 'react-native';

import { GoalCard, goalProgress } from '@/components/finance';
import { Button, Card, Empty, Muted, Screen, Title } from '@/components/ui';
import { formatRp, parseISODate, todayISO } from '@/lib/format';
import { useBalances, useData } from '@/lib/store';
import { colors } from '@/lib/theme';
import type { Goal } from '@/lib/types';

/** How much must be saved per month to hit the target date. */
function monthlyNeed(goal: Goal, current: number): string | null {
  if (!goal.targetDate || current >= goal.targetAmount) return null;
  const now = parseISODate(todayISO());
  const end = parseISODate(goal.targetDate);
  const months = (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth();
  if (months <= 0) return 'Target tanggal sudah lewat.';
  return `Sisihkan ${formatRp(Math.ceil((goal.targetAmount - current) / months))}/bulan untuk mencapai target.`;
}

export default function GoalsScreen() {
  const data = useData();
  const balances = useBalances();

  return (
    <Screen edges={['top']}>
      <Title>Target Tabungan</Title>
      <Button title="+ Target Baru" onPress={() => router.push('/goal/form')} />
      {data.goals.length === 0 && (
        <Card>
          <Empty text="Belum ada target. Buat target seperti Laptop, Liburan, atau Dana Darurat." />
        </Card>
      )}
      {data.goals.map((g) => {
        const { current } = goalProgress(g, balances);
        const need = monthlyNeed(g, current);
        const pocket = data.pockets.find((p) => p.id === g.pocketId);
        return (
          <Card key={g.id}>
            <GoalCard
              goal={g}
              balances={balances}
              onPress={() => router.push({ pathname: '/goal/form', params: { id: g.id } })}
            />
            <Muted>{pocket ? `Terhubung ke ${pocket.icon} ${pocket.name}` : 'Dicatat manual'}</Muted>
            {current >= g.targetAmount ? (
              <Text style={{ color: colors.income, fontWeight: '700' }}>🎉 Target tercapai!</Text>
            ) : (
              need && <Muted>{need}</Muted>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
