import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Text } from 'react-native';

import { Button, Card, Field, Muted, Screen, useUiStyles } from '@/components/ui';
import { useStore } from '@/lib/store';

const KEY_URL = 'https://aistudio.google.com/apikey';

export default function FoodAiScreen() {
  const ui = useUiStyles();
  const current = useStore((s) => s.settings.geminiApiKey);
  const setSettings = useStore((s) => s.setSettings);
  const [key, setKey] = useState(current);

  const save = () => {
    setSettings({ geminiApiKey: key.trim() });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Card>
          <Muted>
            Saat kamu memotret makanan di pengeluaran, FinPocket mengirim foto tersebut ke Google Gemini untuk
            memperkirakan nama hidangan, berat porsi, makronutrisi, % AKG, vitamin & mineral, label diet, dan skor
            kesehatan. Foto yang bukan makanan tidak menampilkan info gizi.
          </Muted>
        </Card>

        <Card>
          <Text style={ui.listTitle}>Cara mendapatkan API key gratis</Text>
          <Muted>1. Buka Google AI Studio dan masuk dengan akun Google.</Muted>
          <Muted>2. Ketuk “Create API key”, lalu salin key-nya.</Muted>
          <Muted>3. Tempel di kolom di bawah ini.</Muted>
          <Text style={ui.link} onPress={() => Linking.openURL(KEY_URL)}>
            Buka aistudio.google.com/apikey ↗
          </Text>
        </Card>

        <Field
          label="Gemini API key"
          value={key}
          onChangeText={setKey}
          placeholder="Tempel API key di sini"
          secureTextEntry
          autoCapitalize="none"
        />
        <Button title="Simpan" onPress={save} />
        {current ? (
          <Button
            title="Nonaktifkan Analisis Gizi"
            variant="danger"
            onPress={() => {
              setSettings({ geminiApiKey: '' });
              router.back();
            }}
          />
        ) : null}

        <Muted>
          Gratis selama akun Google AI Studio tidak dihubungkan ke billing. Jika kuota harian habis, analisis berhenti
          sementara tanpa biaya. Di layanan gratis, Google dapat memakai foto yang dikirim untuk mengembangkan
          produknya. Key hanya disimpan di perangkat ini.
        </Muted>
      </Screen>
    </KeyboardAvoidingView>
  );
}
