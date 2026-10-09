import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { PocketPicker } from '@/components/finance';
import { FoodAnalysisCard } from '@/components/food';
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
import { pocketBalance } from '@/lib/finance';
import { analyzeFood } from '@/lib/food';
import { formatRp, todayISO } from '@/lib/format';
import { deletePhoto, persistPhoto, pickPhoto, type PickedPhoto } from '@/lib/photo';
import { useBalances, useData, useStore } from '@/lib/store';
import { makeStyles, radius, useColors } from '@/lib/theme';
import type { FoodAnalysis, Pocket } from '@/lib/types';

type Mode = 'EXPENSE' | 'INCOME' | 'TRANSFER';

type Analysis =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'food'; food: FoodAnalysis }
  | { status: 'notFood' }
  | { status: 'error'; message: string };

export default function NewTransactionScreen() {
  const ui = useUiStyles();
  const s = useStyles();
  const params = useLocalSearchParams<{ type?: Mode; pocketId?: string; toPocketId?: string; amount?: string }>();
  const data = useData();
  const balances = useBalances();
  const { addExpense, addIncome, addTransfer } = useStore();
  const apiKey = useStore((st) => st.settings.geminiApiKey.trim());
  const colors = useColors();
  const MODE_COLOR: Record<Mode, string> = {
    EXPENSE: colors.expense,
    INCOME: colors.income,
    TRANSFER: colors.transfer,
  };

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
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [analysis, setAnalysis] = useState<Analysis>({ status: 'idle' });
  const [saving, setSaving] = useState(false);
  /** Ignores analysis results for a photo that has since been replaced. */
  const photoSeq = useRef(0);

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

  const takePhoto = async (source: 'camera' | 'library') => {
    let picked: PickedPhoto | null;
    try {
      picked = await pickPhoto(source);
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Foto tidak dapat diambil.');
    }
    if (!picked) return;
    const seq = ++photoSeq.current;
    setPhoto(picked);
    if (!apiKey) return setAnalysis({ status: 'idle' });
    setAnalysis({ status: 'loading' });
    try {
      const food = await analyzeFood(picked.base64, apiKey);
      if (seq === photoSeq.current) setAnalysis(food ? { status: 'food', food } : { status: 'notFood' });
    } catch (e) {
      if (seq === photoSeq.current) {
        setAnalysis({ status: 'error', message: e instanceof Error ? e.message : 'Analisis gagal.' });
      }
    }
  };

  const recordExpense = async (p: Pocket) => {
    if (!photo) return;
    setSaving(true);
    let photoUri: string;
    try {
      photoUri = await persistPhoto(photo.uri);
    } catch {
      setSaving(false);
      return fail('Foto tidak dapat disimpan.');
    }
    const food = analysis.status === 'food' ? analysis.food : undefined;
    const err = addExpense({ amount, pocketId: p.id, categoryId: null, date, note: food?.name ?? '', photoUri, food });
    setSaving(false);
    if (err) {
      deletePhoto(photoUri);
      return fail(err);
    }
    router.back();
  };

  const saveExpense = () => {
    if (!photo) return fail('Ambil foto pengeluaran terlebih dahulu.');
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
    const proceed = () => confirmLocked(pocket, () => recordExpense(pocket));
    if (analysis.status !== 'loading') return proceed();
    Alert.alert('Analisis makanan belum selesai', 'Simpan sekarang tanpa info gizi?', [
      { text: 'Tunggu', style: 'cancel' },
      { text: 'Simpan', onPress: proceed },
    ]);
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

        {mode === 'EXPENSE' && (
          <>
            {photo ? (
              <View style={s.photoWrap}>
                <Image source={{ uri: photo.uri }} style={s.photo} resizeMode="cover" />
                <View style={s.photoActions}>
                  <Pressable style={s.photoBtn} onPress={() => takePhoto('camera')}>
                    <Text style={s.photoBtnText}>📷 Foto ulang</Text>
                  </Pressable>
                  <Pressable style={s.photoBtn} onPress={() => takePhoto('library')}>
                    <Text style={s.photoBtnText}>🖼️ Galeri</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [s.photoEmpty, pressed && { opacity: 0.7 }]}
                onPress={() => takePhoto('camera')}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 40 }}>📷</Text>
                <Text style={s.photoEmptyTitle}>Foto pengeluaranmu</Text>
                <Muted>Makanan, struk, atau barang yang dibeli</Muted>
                <Pressable onPress={() => takePhoto('library')} hitSlop={8} style={{ marginTop: 6 }}>
                  <Text style={ui.link}>atau pilih dari galeri</Text>
                </Pressable>
              </Pressable>
            )}

            {analysis.status === 'loading' && (
              <View style={s.analysisRow}>
                <ActivityIndicator color={colors.primary} />
                <Muted>Menganalisis makanan…</Muted>
              </View>
            )}
            {analysis.status === 'food' && <FoodAnalysisCard food={analysis.food} />}
            {analysis.status === 'error' && <Muted style={{ color: colors.expense }}>⚠️ {analysis.message}</Muted>}
            {photo && !apiKey && (
              <Muted>💡 Isi API key di Pengaturan → Analisis Gizi agar info gizi makanan muncul otomatis.</Muted>
            )}
          </>
        )}

        <AmountField
          label={mode === 'EXPENSE' ? 'Harga' : undefined}
          value={amount}
          onChange={setAmount}
          autoFocus={mode !== 'EXPENSE'}
          large
        />

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

        {mode === 'INCOME' && (
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

        <DatePicker label="Tanggal" value={date} onChange={setDate} />
        {mode !== 'EXPENSE' && (
          <Field label="Catatan (opsional)" value={note} onChangeText={setNote} placeholder="Contoh: Gaji bulan ini" />
        )}

        <Button
          title={saving ? 'Menyimpan…' : 'Simpan'}
          onPress={save}
          disabled={saving}
          style={{ backgroundColor: MODE_COLOR[mode], marginTop: 4 }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  photoEmpty: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 28,
    borderRadius: radius,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  photoEmptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  photoWrap: { borderRadius: radius, overflow: 'hidden', backgroundColor: colors.card },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  photoActions: { flexDirection: 'row', position: 'absolute', right: 8, bottom: 8, gap: 6 },
  photoBtn: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  photoBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  analysisRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
}));
