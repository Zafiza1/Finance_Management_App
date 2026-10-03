import { router } from 'expo-router';
import { Alert } from 'react-native';

import { Button, Card, Empty, ListRow, Muted, Screen, SectionHeader } from '@/components/ui';
import { pocketBalance } from '@/lib/finance';
import { formatRp } from '@/lib/format';
import { useBalances, useData, useStore } from '@/lib/store';

export default function PocketsScreen() {
  const data = useData();
  const balances = useBalances();
  const setArchived = useStore((s) => s.setPocketArchived);
  const active = data.pockets.filter((p) => !p.archived);
  const archived = data.pockets.filter((p) => p.archived);
  const pocketTotal = active.reduce((sum, p) => sum + pocketBalance(balances, p.id), 0);

  return (
    <Screen edges={['bottom']}>
      <Card>
        <Muted>Total saldo seluruh Pocket</Muted>
        <ListRow title={formatRp(pocketTotal)} subtitle={`Belum dialokasikan: ${formatRp(balances.unallocated)}`} />
      </Card>
      <Button title="+ Tambah Pocket" onPress={() => router.push('/pocket/form')} />

      <Card style={{ paddingVertical: 4 }}>
        {active.map((p) => (
          <ListRow
            key={p.id}
            icon={p.icon}
            title={`${p.name}${p.isLocked ? ' 🔒' : ''}`}
            subtitle={[
              p.budget > 0 ? `Budget ${formatRp(p.budget)}/bulan` : 'Tanpa budget',
              p.isSavings ? 'Tabungan' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            right={<Muted style={{ fontWeight: '700' }}>{formatRp(pocketBalance(balances, p.id))}</Muted>}
            onPress={() => router.push({ pathname: '/pocket/[id]', params: { id: p.id } })}
          />
        ))}
        {active.length === 0 && <Empty text="Belum ada Pocket." />}
      </Card>

      {archived.length > 0 && (
        <>
          <SectionHeader title="Diarsipkan" />
          <Card style={{ paddingVertical: 4 }}>
            {archived.map((p) => (
              <ListRow
                key={p.id}
                icon={p.icon}
                title={p.name}
                subtitle="Ketuk untuk memulihkan"
                onPress={() =>
                  Alert.alert(`Pulihkan ${p.name}?`, undefined, [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Pulihkan', onPress: () => setArchived(p.id, false) },
                  ])
                }
              />
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
