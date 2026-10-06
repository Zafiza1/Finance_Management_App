import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { AmountField, Button, Card, Muted, ProgressBar, Screen } from '@/components/ui';
import { budgetStatus, currentMonthPeriod, pocketSpent } from '@/lib/finance';
import { formatRp, monthLabel, parseISODate, todayISO } from '@/lib/format';
import { useData, useStore } from '@/lib/store';
import { budgetColors, useColors } from '@/lib/theme';

export default function BudgetsScreen() {
  const colors = useColors();
  const data = useData();
  const savePocket = useStore((s) => s.savePocket);
  const today = todayISO();
  const period = currentMonthPeriod(today);
  const now = parseISODate(today);
  const pockets = data.pockets.filter((p) => !p.archived);
  const [budgets, setBudgets] = useState<Record<string, number>>(
    Object.fromEntries(pockets.map((p) => [p.id, p.budget])),
  );

  const save = () => {
    for (const p of pockets) {
      if (budgets[p.id] === p.budget) continue;
      const err = savePocket({ ...p, budget: budgets[p.id] ?? 0 });
      if (err) return Alert.alert('Tidak dapat disimpan', err);
    }
    router.back();
  };

  const total = Object.values(budgets).reduce((a, b) => a + b, 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Card>
          <Muted>Budget {monthLabel(now.getFullYear(), now.getMonth())}</Muted>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{formatRp(total)}</Text>
          <Muted>Kosongkan (0) jika Pocket tidak memakai budget.</Muted>
        </Card>
        {pockets.map((p) => {
          const b = budgets[p.id] ?? 0;
          const st = b > 0 ? budgetStatus(p.name, b, pocketSpent(data, p.id, period)) : null;
          return (
            <Card key={p.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>
                  {p.icon} {p.name}
                </Text>
                {st && <Text style={{ color: budgetColors[st.level], fontWeight: '700' }}>{st.label}</Text>}
              </View>
              <AmountField value={b} onChange={(n) => setBudgets((x) => ({ ...x, [p.id]: n }))} />
              {st && (
                <>
                  <ProgressBar pct={st.pct} color={budgetColors[st.level]} />
                  <Muted>
                    Terpakai {formatRp(st.spent)} · Sisa {formatRp(Math.max(0, st.remaining))} · {Math.round(st.pct)}%
                  </Muted>
                </>
              )}
            </Card>
          );
        })}
        <Button title="Simpan Budget" onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
