import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, Text, View } from 'react-native';

import { ActivityRow } from '@/components/finance';
import { Chip, ChipRow, Empty } from '@/components/ui';
import { buildActivity, type ActivityKind } from '@/lib/finance';
import { formatDayHeader } from '@/lib/format';
import { useData } from '@/lib/store';
import { makeStyles, useColors } from '@/lib/theme';

const FILTERS: { value: ActivityKind | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'INCOME', label: 'Pemasukan' },
  { value: 'EXPENSE', label: 'Pengeluaran' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'ALLOCATION', label: 'Alokasi' },
];

export default function HistoryScreen() {
  const s = useStyles();
  const colors = useColors();
  const { pocketId } = useLocalSearchParams<{ pocketId?: string }>();
  const data = useData();
  const [filter, setFilter] = useState<ActivityKind | 'ALL'>('ALL');
  const pocket = data.pockets.find((p) => p.id === pocketId);

  const sections = useMemo(() => {
    const items = buildActivity(data).filter(
      (a) => (filter === 'ALL' || a.kind === filter) && (!pocketId || a.pocketIds.includes(pocketId)),
    );
    const groups: { title: string; data: typeof items }[] = [];
    for (const item of items) {
      const last = groups[groups.length - 1];
      if (last?.title === item.date) last.data.push(item);
      else groups.push({ title: item.date, data: [item] });
    }
    return groups;
  }, [data, filter, pocketId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {pocket && <Stack.Screen options={{ title: `Riwayat ${pocket.name}` }} />}
      <SectionList
        sections={sections}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <ChipRow>
              {FILTERS.map((f) => (
                <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
              ))}
            </ChipRow>
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={s.header}>{formatDayHeader(section.title)}</Text>}
        renderItem={({ item }) => (
          <View style={s.item}>
            <ActivityRow item={item} />
          </View>
        )}
        ListEmptyComponent={<Empty text="Belum ada transaksi." />}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { marginTop: 16, marginBottom: 6, fontWeight: '700', color: colors.muted },
  item: { backgroundColor: colors.card, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6 },
}));
