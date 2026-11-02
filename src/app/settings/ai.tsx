import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import {
  AI_PRESETS,
  getAiConfig,
  setAiConfig,
  testAiConnection,
  type AiProvider,
} from '@/features/muse/ai';
import { museKeys } from '@/features/muse/queries';

type TestState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'ok'; model: string; latencyMs: number }
  | { status: 'error'; message: string };

/**
 * Muse bağlantı ayarları.
 *
 * İki seçenek de aynı işi yapar: sohbeti gerçek bir modele taşır. Ollama
 * yerel ve ücretsizdir; OpenAI uyumlu seçenek bulut ya da kendi sunucun
 * için anahtar kabul eder. Anahtar yalnızca cihazdaki SQLite'ta tutulur.
 */
export default function AiSettingsScreen() {
  const { c, space, radius } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [initial] = useState(getAiConfig);

  const [provider, setProvider] = useState<AiProvider>(initial.provider);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [test, setTest] = useState<TestState>({ status: 'idle' });

  const preset = AI_PRESETS[provider];

  const changeProvider = (next: AiProvider) => {
    haptic('tick');
    setProvider(next);
    setBaseUrl(AI_PRESETS[next].baseUrl);
    setModel(AI_PRESETS[next].model);
    setTest({ status: 'idle' });
  };

  const current = () => ({
    provider,
    baseUrl: baseUrl.trim().replace(/\/+$/, ''),
    model: model.trim(),
    apiKey: apiKey.trim(),
    enabled: true,
  });

  const runTest = async () => {
    setTest({ status: 'running' });
    try {
      const result = await testAiConnection(current());
      setTest({ status: 'ok', model: result.model, latencyMs: result.latencyMs });
      haptic('success');
    } catch (cause) {
      setTest({
        status: 'error',
        message: cause instanceof Error ? cause.message : 'Bağlantı kurulamadı.',
      });
    }
  };

  const save = () => {
    if (!baseUrl.trim() || !model.trim()) {
      setTest({ status: 'error', message: 'Sunucu adresi ve model boş olamaz.' });
      return;
    }

    setAiConfig(current());
    setEnabled(true);
    void queryClient.invalidateQueries({ queryKey: museKeys.aiConfig });
    haptic('success');
    toast('Muse bağlandı');
  };

  const disconnect = () => {
    setAiConfig({ enabled: false });
    setEnabled(false);
    void queryClient.invalidateQueries({ queryKey: museKeys.aiConfig });
    toast('Bağlantı kesildi', 'info');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Muse" subtitle="AI bağlantısı" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.xxl,
          gap: space.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            padding: space.md,
            gap: space.sm,
            borderRadius: radius.card,
            backgroundColor: c.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: enabled ? c.focusSoft : c.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: enabled ? c.focus : c.textFaint,
              }}
            />
            <AppText
              variant="meta"
              style={{ color: enabled ? c.focus : c.textMuted, letterSpacing: 1.2 }}
            >
              {enabled ? 'BAĞLI' : 'BAĞLI DEĞİL'}
            </AppText>
          </View>

          <AppText variant="title">{enabled ? model || preset.model : 'Bir model seç'}</AppText>
          <AppText variant="body" muted>
            {enabled
              ? 'Yanıtlar bu modelden gelir. Sohbet geçmişi ve anahtar cihazda kalır.'
              : 'Muse yanıt üretmek için bir modele ihtiyaç duyar. Yerel Ollama en hızlı başlangıçtır.'}
          </AppText>
        </View>

        <View style={{ gap: space.xs }}>
          <AppText variant="meta" muted style={{ letterSpacing: 1.1, fontWeight: '600' }}>
            SAĞLAYICI
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
            <Chip
              label="Ollama (yerel)"
              selected={provider === 'ollama'}
              role="radio"
              onPress={() => changeProvider('ollama')}
            />
            <Chip
              label="OpenAI uyumlu"
              selected={provider === 'openai'}
              role="radio"
              onPress={() => changeProvider('openai')}
            />
          </View>
          <AppText variant="meta" faint>
            {preset.hint}
          </AppText>
        </View>

        <TextField
          label="SUNUCU ADRESİ"
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder={preset.baseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Sunucu adresi"
        />

        <TextField
          label="MODEL"
          value={model}
          onChangeText={setModel}
          placeholder={preset.model}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Model adı"
          hint={
            provider === 'ollama'
              ? 'Örnek: llama3.2, qwen2.5:7b, mistral. Modelin `ollama list` çıktısında olmalı.'
              : 'Sağlayıcının model kimliği. Örnek: gpt-4o-mini, openai/gpt-4o-mini.'
          }
        />

        {preset.needsKey ? (
          <TextField
            label="API ANAHTARI"
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="API anahtarı"
            hint="Yalnızca bu cihazda saklanır; yedek dosyasına da yazılır."
          />
        ) : null}

        {test.status === 'ok' ? (
          <StatusRow
            tone="ok"
            text={`Bağlantı tamam · ${test.model} · ${test.latencyMs} ms`}
          />
        ) : null}
        {test.status === 'error' ? <StatusRow tone="error" text={test.message} /> : null}

        <View style={{ gap: space.sm }}>
          <Button
            label="Bağlantıyı dene"
            icon="pulse-outline"
            variant="secondary"
            onPress={runTest}
            loading={test.status === 'running'}
          />
          <Button label="Kaydet" icon="checkmark-outline" onPress={save} />
          {enabled ? (
            <Button
              label="Bağlantıyı kes"
              icon="power-outline"
              variant="ghost"
              onPress={disconnect}
            />
          ) : null}
        </View>

        <View style={{ gap: space.xs }}>
          <InfoRow
            icon="lock-closed-outline"
            text="İstekler doğrudan seçtiğin sunucuya gider. Plot araya sunucu koymaz."
          />
          <InfoRow
            icon="cloud-offline-outline"
            text="Yerel modelde internet gerekmez; bulut sağlayıcıda yalnızca yazdığın mesajlar gönderilir."
          />
          <InfoRow
            icon="wallet-outline"
            text="Ollama ücretsizdir. Bulut sağlayıcı kendi fiyatlandırmasını uygular."
          />
        </View>

        <Button
          label="Muse'u aç"
          icon="sparkles-outline"
          variant="ghost"
          onPress={() => router.push('/muse')}
        />
      </ScrollView>
    </View>
  );
}

function StatusRow({ tone, text }: { tone: 'ok' | 'error'; text: string }) {
  const { c, space, radius } = useTheme();
  const color = tone === 'ok' ? c.focus : c.danger;

  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.xs,
        padding: space.sm,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: color,
        backgroundColor: c.surface,
      }}
    >
      <Ionicons
        name={tone === 'ok' ? 'checkmark-circle' : 'alert-circle-outline'}
        size={16}
        color={color}
        style={{ marginTop: 1 }}
      />
      <AppText variant="meta" style={{ flex: 1, color }}>
        {text}
      </AppText>
    </View>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  const { c, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
      <View style={{ width: 20, alignItems: 'center', paddingTop: 2 }}>
        <Ionicons name={icon} size={16} color={c.textMuted} />
      </View>
      <AppText variant="meta" muted style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
