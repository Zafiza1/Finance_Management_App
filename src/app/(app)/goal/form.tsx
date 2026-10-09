import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';

import { GoalCard } from '@/components/finance';
import {
  AmountField,
  Button,
  Card,
  Chip,
  ChipRow,
  DatePicker,
  Field,
  Muted,
  Screen,
  useUiStyles,
} from '@/components/ui';
import { GOAL_ICONS } from '@/lib/defaults';
import { addMonths, todayISO } from '@/lib/format';
import { useBalances, useData, useStore } from '@/lib/store';

export default function GoalFormScreen() {
  const ui = useUiStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useData();
  const balances = useBalances();
  const { saveGoal, deleteGoal, addGoalFunds } = useStore();
  const existing = data.goals.find((g) => g.id === id);
  const savingsPocket = data.pockets.find((p) => p.isSavings && !p.archived && !p.isLocked);

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '🎯');
  const [target, setTarget] = useState(existing?.targetAmount ?? 0);
  const [targetDate, setTargetDate] = useState<string | null>(
    existing ? existing.targetDate : addMonths(todayISO(), 6),
  );
  const [pocketId, setPocketId] = useState<string | null>(existing ? existing.pocketId : savingsPocket?.id ?? null);
  const [current, setCurrent] = useState(existing?.currentAmount ?? 0);
  const [topUp, setTopUp] = useState(0);

  const save = () => {
    const err = saveGoal({
      id: existing?.id,
      name,
      icon,
      targetAmount: target,
      targetDate,
      pocketId,
      currentAmount: pocketId ? 0 : current,
    });
    if (err) return Alert.alert('Tidak dapat disimpan', err);
    router.back();
  };

  const remove = () =>
    existing &&
    Alert.alert(`Hapus target ${existing.name}?`, 'Saldo Pocket tidak berubah.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          deleteGoal(existing.id);
          router.back();
        },
      },
    ]);

  const addFunds = () => {
    if (!existing) return;
    const err = addGoalFunds(existing.id, topUp);
    if (err) return Alert.alert('Gagal', err);
    setCurrent((c) => c + topUp);
    setTopUp(0);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ title: existing ? 'Edit Target' : 'Target Baru' }} />
        {existing && (
          <Card>
            <GoalCard goal={existing} balances={balances} />
          </Card>
        )}

        <Field label="Nama target" value={name} onChangeText={setName} placeholder="Contoh: Laptop" />
        <Text style={ui.label}>Icon</Text>
        <ChipRow>
          {GOAL_ICONS.map((i) => (
            <Chip key={i} label={i} selected={icon === i} onPress={() => setIcon(i)} />
          ))}
        </ChipRow>
        <AmountField label="Target nominal" value={target} onChange={setTarget} />
        {targetDate ? (
          <>
            <DatePicker label="Target tanggal" value={targetDate} onChange={setTargetDate} minDate={todayISO()} />
            <Button title="Tanpa target tanggal" variant="ghost" onPress={() => setTargetDate(null)} />
          </>
        ) : (
          <Button title="+ Tambah target tanggal" variant="ghost" onPress={() => setTargetDate(addMonths(todayISO(), 6))} />
        )}

        <Text style={ui.label}>Sumber dana</Text>
        <ChipRow>
          {data.pockets
            .filter((p) => !p.archived)
            .map((p) => (
              <Chip key={p.id} label={`${p.icon} ${p.name}`} selected={pocketId === p.id} onPress={() => setPocketId(p.id)} />
            ))}
          <Chip label="✍️ Manual" selected={pocketId === null} onPress={() => setPocketId(null)} />
        </ChipRow>
        <Muted>
          {pocketId
            ? 'Progress mengikuti saldo Pocket yang dipilih secara otomatis.'
            : 'Progress dicatat manual, terpisah dari saldo Pocket.'}
        </Muted>
        {!pocketId && !existing && <AmountField label="Saldo saat ini" value={current} onChange={setCurrent} />}
        {!pocketId && existing && !existing.pocketId && (
          <Card>
            <AmountField label="Tambah dana" value={topUp} onChange={setTopUp} />
            <Button title="Tambah" variant="secondary" onPress={addFunds} />
          </Card>
        )}

        <Button title="Simpan" onPress={save} />
        {existing && <Button title="Hapus Target" variant="danger" onPress={remove} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}
