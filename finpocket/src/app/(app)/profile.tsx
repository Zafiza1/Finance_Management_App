import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, Field, Muted, Screen } from '@/components/ui';
import { useCurrentUser, useStore } from '@/lib/store';

export default function ProfileScreen() {
  const user = useCurrentUser();
  const updateProfile = useStore((s) => s.updateProfile);
  const [name, setName] = useState(user?.name ?? '');

  const save = () => {
    const err = updateProfile(name);
    if (err) return Alert.alert('Tidak dapat disimpan', err);
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: 12 }}>
        <Field label="Nama" value={name} onChangeText={setName} autoCapitalize="words" />
        <Muted>Email: {user?.email}</Muted>
      </Card>
      <Button title="Simpan" onPress={save} />
    </Screen>
  );
}
