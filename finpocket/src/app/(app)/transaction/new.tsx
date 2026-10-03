import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';

import { PocketPicker } from '@/components/finance';
import {
  AmountField,
  Button,
  Chip,
  ChipRow,
  DateStepper,
  Field,
  Muted,
  Screen,
  Segmented,
  styles as ui,
} from '@/components/ui';
import { pocketBalance } from '@/lib/finance';
import { formatRp, todayISO } from '@/lib/format';
import { useBalances, useData, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import type { Pocket } from '@/lib/types';

type Mode = 'EXPENSE' | 'INCOME' | 'TRANSFER';

const MODE_COLOR: Record<Mode, string> = {
  EXPENSE: colors.expense,
  INCOME: colors.income,
  TRANSFER: colors.transfer,
};

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: Mode; pocketId?: string; toPocketId?: string; amount?: string }>();
  const data = useData();
  const balances = useBalances();
  const { addExpense, addIncome, addTransfer } = useStore();

  const lastExpensePocket = useMemo(() => {
    const active = new Set(data.pockets.filter((p) => !p.archived && !p.isLocked).map((p) => p.id));
    const last = [...data.transactions]
      .reverse()
      .find((t) => t.type === 'EXPENSE' && t.pocketId && active.has(t.pocketId));
    return last?.pocketId ?? data.pockets.find((p) => active.has(p.id))?.id ?? null;
  }, [data]);

  const [mode, setMode] = useState<Mode>(params.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(params.amount ? Number(params.amount) : 0);
  const [pocketId, setPocketId] = useState<string | null>(params.pocketId ?? lastExpensePocket);
  const [toPocketId, setToPocketId] = useState<string | null>(params.toPocketId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [resume, setResume] = useState<{ pocketId: string; amount: number } | null>(null);

  const categories = data.categories.filter((c) => c.type === (mode === 'INCOME' ? 'INCOME' : 'EXPENSE'));
  const pocket = data.pockets.find((p) => p.id === pocketId);

  const fail = (msg: string) => Alert.alert('Tidak dapat disimpan', msg);

  /** Locked pockets need an explicit confirmation before money leaves them. */
  const confirmLocked = (p: Pocket | undefined, proceed: () => void) => {
    if (!p?.isLocked) return proceed();
    Alert.alert(`🔒 ${p.name} terkunci`, `Apakah kamu yakin ingin menggunakan ${p.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Ya, Gunakan', onPress: proceed },
    ]);
  };

  const saveExpense = () => {
    if (!pocket) return fail('Pilih Pocket yang digunakan.');
    const balance = pocketBalance(balances, pocket.id);
    if (amount > balance) {
      Alert.alert(
        'Saldo Pocket tidak mencukupi.',
        `Saldo ${pocket.name}: ${formatRp(balance)}\nKurang: ${formatRp(amount - balance)}`,
        [
          { text: 'Batalkan', style: 'cancel' },
          { text: 'Pindahkan Uang', onPress: () => startTransferTo(pocket.id, amount - balance) },
        ],
      );
      return;
    }
    confirmLocked(pocket, () => {
      const err = addExpense({ amount, pocketId: pocket.id, categoryId, date, note: note.trim() });
      if (err) return fail(err);
      router.back();
    });
  };

  /** Switches the form to a transfer that tops up the short pocket, then resumes the expense. */
  function startTransferTo(target: string, shortfall: number) {
    setResume({ pocketId: target, amount });
    setMode('TRANSFER');
    setToPocketId(target);
    setPocketId(null);
    setAmount(shortfall);
  }

  const saveIncome = () => {
    const err = addIncome({ amount, categoryId, date, note: note.trim() });
    if (err) return fail(err);
    Alert.alert('Pemasukan tersimpan', `${formatRp(amount)} ditambahkan ke Total Saldo. Bagi ke Pocket sekarang?`, [
      { text: 'Nanti', style: 'cancel', onPress: () => router.back() },
      { text: 'Bagi Sekarang', onPress: () => router.replace('/allocate') },
    ]);
  };

  const saveTransfer = () => {
    const from = data.pockets.find((p) => p.id === pocketId);
    if (!from || !toPocketId) return fail('Pilih Pocket asal dan tujuan.');
    confirmLocked(from, () => {
      const err = addTransfer({ amount, fromPocketId: from.id, toPocketId, date, note: note.trim() });
      if (err) return fail(err);
      if (!resume) return router.back();
      setMode('EXPENSE');
      setPocketId(resume.pocketId);
      setAmount(resume.amount);
      setToPocketId(null);
      setResume(null);
    });
  };

  const save = () => {
    if (amount <= 0) return fail('Masukkan nominal.');
    if (mode === 'EXPENSE') saveExpense();
    else if (mode === 'INCOME') saveIncome();
    else saveTransfer();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            setCategoryId(null);
            setResume(null);
          }}
          options={[
            { value: 'EXPENSE', label: 'Pengeluaran', color: MODE_COLOR.EXPENSE },
            { value: 'INCOME', label: 'Pemasukan', color: MODE_COLOR.INCOME },
            { value: 'TRANSFER', label: 'Transfer', color: MODE_COLOR.TRANSFER },
          ]}
        />

        <AmountField value={amount} onChange={setAmount} autoFocus large />

        {mode === 'EXPENSE' && (
          <>
            <Text style={ui.label}>Pocket</Text>
            <PocketPicker pockets={data.pockets} balances={balances} value={pocketId} onChange={setPocketId} />
            {pocket && amount > 0 && (
              <Muted>
                {pocket.icon} {pocket.name}: {formatRp(pocketBalance(balances, pocket.id))} →{' '}
                {formatRp(pocketBalance(balances, pocket.id) - amount)}
              </Muted>
            )}
          </>
        )}

        {mode === 'TRANSFER' && (
          <>
            <Text style={ui.label}>Dari Pocket</Text>
            <PocketPicker
              pockets={data.pockets}
              balances={balances}
              value={pocketId}
              onChange={setPocketId}
              exclude={toPocketId}
            />
            <Text style={ui.label}>Ke Pocket</Text>
            <PocketPicker
              pockets={data.pockets}
              balances={balances}
              value={toPocketId}
              onChange={setToPocketId}
              exclude={pocketId}
            />
            <Muted>
              {resume
                ? 'Setelah transfer, kamu akan kembali ke pengeluaran tadi.'
                : 'Transfer hanya memindahkan saldo — bukan pemasukan atau pengeluaran.'}
            </Muted>
          </>
        )}

        {mode !== 'TRANSFER' && (
          <>
            <Text style={ui.label}>Kategori (opsional)</Text>
            <ChipRow>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.icon} ${c.name}`}
                  selected={c.id === categoryId}
                  color={MODE_COLOR[mode]}
                  onPress={() => setCategoryId(c.id === categoryId ? null : c.id)}
                />
              ))}
            </ChipRow>
          </>
        )}

        <DateStepper label="Tanggal" value={date} onChange={setDate} />
        <Field label="Catatan (opsional)" value={note} onChangeText={setNote} placeholder="Contoh: Makan siang" />

        <Button title="Simpan" onPress={save} style={{ backgroundColor: MODE_COLOR[mode], marginTop: 4 }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
