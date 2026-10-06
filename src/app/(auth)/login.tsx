import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { Button, Card, Field, Muted, Screen, Segmented } from '@/components/ui';
import { useStore } from '@/lib/store';
import { makeStyles } from '@/lib/theme';

export default function AuthScreen() {
  const s = useStyles();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login, register } = useStore();

  const submit = async () => {
    setBusy(true);
    setError(null);
    const err = mode === 'login' ? await login(email, password) : await register(name, email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} contentStyle={{ justifyContent: 'center', flexGrow: 1 }}>
        <View style={s.hero}>
          <Text style={s.logo}>👛</Text>
          <Text style={s.brand}>FinPocket</Text>
          <Muted style={{ textAlign: 'center' }}>Atur uangmu, tentukan ke mana perginya.</Muted>
        </View>
        <Card style={{ gap: 14 }}>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            options={[
              { value: 'login', label: 'Masuk' },
              { value: 'register', label: 'Daftar' },
            ]}
          />
          {mode === 'register' && <Field label="Nama" value={name} onChangeText={setName} autoCapitalize="words" />}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          {error && <Text style={s.error}>{error}</Text>}
          <Button title={mode === 'login' ? 'Masuk' : 'Buat Akun'} onPress={submit} disabled={busy} />
        </Card>
        <Muted style={{ textAlign: 'center' }}>Data tersimpan aman di perangkat ini.</Muted>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { alignItems: 'center', gap: 4, marginBottom: 12 },
  logo: { fontSize: 56 },
  brand: { fontSize: 32, fontWeight: '800', color: colors.primary },
  error: { color: colors.expense, fontWeight: '600' },
}));
