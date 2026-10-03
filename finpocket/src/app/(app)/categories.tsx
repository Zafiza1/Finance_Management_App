import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, Field, ListRow, Muted, Screen, Segmented } from '@/components/ui';
import { POCKET_COLORS } from '@/lib/defaults';
import { useData, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import type { Category, CategoryType } from '@/lib/types';

export default function CategoriesScreen() {
  const data = useData();
  const { saveCategory, deleteCategory } = useStore();
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');

  const list = data.categories.filter((c) => c.type === type);

  const startEdit = (c: Category | null) => {
    setEditing(c);
    setName(c?.name ?? '');
    setIcon(c?.icon ?? '📦');
  };

  const save = () => {
    const err = saveCategory({
      id: editing?.id,
      name,
      icon: icon.trim() || '📦',
      type,
      color: editing?.color ?? POCKET_COLORS[list.length % POCKET_COLORS.length],
    });
    if (err) return Alert.alert('Tidak dapat disimpan', err);
    startEdit(null);
  };

  const remove = (c: Category) =>
    Alert.alert(`Hapus kategori ${c.name}?`, 'Transaksi lama tetap tersimpan tanpa kategori.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          deleteCategory(c.id);
          if (editing?.id === c.id) startEdit(null);
        },
      },
    ]);

  return (
    <Screen edges={['bottom']}>
      <Segmented
        value={type}
        onChange={(t) => {
          setType(t);
          startEdit(null);
        }}
        options={[
          { value: 'EXPENSE', label: 'Pengeluaran' },
          { value: 'INCOME', label: 'Pemasukan' },
        ]}
      />

      <Card>
        <Text style={{ fontWeight: '700', color: colors.text }}>{editing ? 'Edit kategori' : 'Tambah kategori'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ width: 80 }}>
            <Field label="Icon" value={icon} onChangeText={setIcon} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Nama" value={name} onChangeText={setName} placeholder="Contoh: Kopi" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {editing && <Button title="Batal" variant="ghost" onPress={() => startEdit(null)} style={{ flex: 1 }} />}
          <Button title={editing ? 'Simpan' : 'Tambah'} onPress={save} style={{ flex: 1 }} />
        </View>
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        {list.map((c) => (
          <ListRow
            key={c.id}
            icon={c.icon}
            title={c.name}
            onPress={() => startEdit(c)}
            right={
              <Pressable onPress={() => remove(c)} hitSlop={10}>
                <Text style={{ color: colors.expense, fontWeight: '600' }}>Hapus</Text>
              </Pressable>
            }
          />
        ))}
      </Card>
      <Muted style={{ textAlign: 'center' }}>Ketuk kategori untuk mengedit.</Muted>
    </Screen>
  );
}
