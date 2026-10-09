import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Image, Text } from 'react-native';

import { FoodAnalysisCard } from '@/components/food';
import { Button, Card, Empty, Muted, Screen } from '@/components/ui';
import { formatDate, formatRp } from '@/lib/format';
import { useData, useStore } from '@/lib/store';
import { makeStyles, radius } from '@/lib/theme';

export default function TransactionDetailScreen() {
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const deleteTransaction = useStore((st) => st.deleteTransaction);
  const tx = data.transactions.find((t) => t.id === id);
  if (!tx) return <Empty text="Transaksi tidak ditemukan." />;
  const pocket = data.pockets.find((p) => p.id === tx.pocketId);

  const remove = () =>
    Alert.alert('Hapus transaksi?', 'Saldo akan dihitung ulang otomatis.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          const err = deleteTransaction(tx.id);
          if (err) return Alert.alert('Gagal', err);
          router.back();
        },
      },
    ]);

  return (
    <Screen edges={['bottom']}>
      {tx.photoUri && <Image source={{ uri: tx.photoUri }} style={s.photo} resizeMode="cover" />}
      <Card>
        <Text style={s.amount}>-{formatRp(tx.amount)}</Text>
        <Muted>
          {formatDate(tx.date)}
          {pocket ? ` · ${pocket.icon} ${pocket.name}` : ''}
        </Muted>
      </Card>
      {tx.food && <FoodAnalysisCard food={tx.food} />}
      <Button title="Hapus Transaksi" variant="danger" onPress={remove} />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius, backgroundColor: colors.card },
  amount: { fontSize: 28, fontWeight: '800', color: colors.expense },
}));
