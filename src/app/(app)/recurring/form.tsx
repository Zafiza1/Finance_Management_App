import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';

import { PocketPicker } from '@/components/finance';
import {
  AmountField,
  Button,
  Chip,
  ChipRow,
  DatePicker,
  Field,
  Muted,
  Screen,
  Segmented,
  useUiStyles,
} from '@/components/ui';
import { FREQUENCY_LABEL, occurrenceDate } from '@/lib/finance';
import { addMonths, formatDate, todayISO } from '@/lib/format';
import { useBalances, useData, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import type { Frequency } from '@/lib/types';

const FREQUENCIES: Frequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

export default function RecurringFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useData();
  const balances = useBalances();
  const ui = useUiStyles();
  const colors = useColors();
  const { saveRecurring, deleteRecurring } = useStore();
  const existing = data.recurring.find((r) => r.id === id);

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(existing?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(existing?.amount ?? 0);
  const [pocketId, setPocketId] = useState<string | null>(existing?.pocketId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [note, setNote] = useState(existing?.note ?? '');
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? 'MONTHLY');
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState<string | null>(existing?.endDate ?? null);

  const color = type === 'INCOME' ? colors.income : colors.expense;
  const categories = data.categories.filter((c) => c.type === type);
  const preview = [0, 1, 2].map((n) => occurrenceDate({ startDate, frequency }, n));

  const save = () => {
    const err = saveRecurring({
      id: existing?.id,
      type,
      amount,
      pocketId,
      categoryId,
      note,
      frequency,
      startDate,
      endDate,
      active: existing?.active ?? true,
    });
    if (err) return Alert.alert('Tidak dapat disimpan', err);
    const run = useStore.getState().runRecurring();
    if (run.created > 0) Alert.alert('Transaksi Berulang', `${run.created} transaksi yang jatuh tempo telah dicatat.`);
    if (run.blocked.length > 0) {
      Alert.alert('Transaksi Berulang', 'Sebagian transaksi tertunda karena saldo Pocket tidak mencukupi.');
    }
    router.back();
  };

  const remove = () =>
    existing &&
    Alert.alert('Hapus jadwal ini?', 'Transaksi yang sudah tercatat tetap ada di riwayat.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          deleteRecurring(existing.id);
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ title: existing ? 'Edit Jadwal' : 'Jadwal Baru' }} />
        <Segmented
          value={type}
          onChange={(t) => {
            setType(t);
            setCategoryId(null);
          }}
          options={[
            { value: 'EXPENSE', label: 'Pengeluaran', color: colors.expense },
            { value: 'INCOME', label: 'Pemasukan', color: colors.income },
          ]}
        />
        <AmountField value={amount} onChange={setAmount} large />
        <Field
          label="Nama / catatan"
          value={note}
          onChangeText={setNote}
          placeholder={type === 'INCOME' ? 'Contoh: Gaji' : 'Contoh: Langganan internet'}
        />

        {type === 'EXPENSE' && (
          <>
            <Text style={ui.label}>Diambil dari Pocket</Text>
            <PocketPicker pockets={data.pockets} balances={balances} value={pocketId} onChange={setPocketId} />
          </>
        )}
        {type === 'INCOME' && <Muted>Pemasukan masuk ke saldo “belum dialokasikan”, lalu bisa kamu bagi ke Pocket.</Muted>}

        <Text style={ui.label}>Kategori (opsional)</Text>
        <ChipRow>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={`${c.icon} ${c.name}`}
              selected={c.id === categoryId}
              color={color}
              onPress={() => setCategoryId(c.id === categoryId ? null : c.id)}
            />
          ))}
        </ChipRow>

        <Text style={ui.label}>Frekuensi</Text>
        <ChipRow>
          {FREQUENCIES.map((f) => (
            <Chip key={f} label={FREQUENCY_LABEL[f]} selected={f === frequency} onPress={() => setFrequency(f)} />
          ))}
        </ChipRow>

        <DatePicker label="Mulai tanggal" value={startDate} onChange={setStartDate} />
        <Muted>Jadwal: {preview.map(formatDate).join(', ')}, …</Muted>

        {endDate ? (
          <>
            <DatePicker label="Berakhir tanggal" value={endDate} onChange={setEndDate} minDate={startDate} />
            <Button title="Tanpa tanggal berakhir" variant="ghost" onPress={() => setEndDate(null)} />
          </>
        ) : (
          <Button title="+ Atur tanggal berakhir" variant="ghost" onPress={() => setEndDate(addMonths(startDate, 12))} />
        )}

        {startDate < todayISO() && !existing && (
          <Muted>Tanggal mulai sudah lewat — transaksi sejak tanggal tersebut akan langsung dicatat.</Muted>
        )}

        <Button title="Simpan" onPress={save} style={{ backgroundColor: color }} />
        {existing && <Button title="Hapus Jadwal" variant="danger" onPress={remove} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}
