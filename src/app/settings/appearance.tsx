import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import {
  getAppearance,
  isAppearanceForcedByUrl,
  setAppearance,
  useTheme,
  type AppearanceMode,
} from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { setAppearanceSetting } from '@/features/settings/preferences';

/**
 * Görünüm — tema tercihi. Seçim anında uygulanır ve `settings` tablosuna
 * yazılır; bir sonraki açılışta kök layout tercihi geri yükler.
 */
export default function AppearanceScreen() {
  const { c, space, radius, dark } = useTheme();
  const [mode, setMode] = useState<AppearanceMode>(() => getAppearance());
  const [saveError, setSaveError] = useState<string | null>(null);
  const forcedByUrl = isAppearanceForcedByUrl();

  const choose = (next: string) => {
    const value = next as AppearanceMode;
    if (value === mode) return;

    haptic('tick');
    setMode(value);
    setAppearance(value);

    try {
      setAppearanceSetting(value);
      setSaveError(null);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Tercih kaydedilemedi.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Görünüm" subtitle="Uygulama genelinde geçerli" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.xxl,
          gap: space.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl
          value={mode}
          onChange={choose}
          segments={[
            { value: 'system', label: 'Sistem' },
            { value: 'dark', label: 'Koyu' },
            { value: 'light', label: 'Açık' },
          ]}
        />

        <AppText variant="meta" muted>
          {mode === 'system'
            ? 'Cihazın görünüm ayarı izlenir; sistem koyu moda geçtiğinde Plot da geçer.'
            : mode === 'dark'
              ? 'Her zaman koyu tema kullanılır.'
              : 'Her zaman açık tema kullanılır.'}
        </AppText>

        {forcedByUrl ? (
          <View
            style={{
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: c.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
            }}
          >
            <AppText variant="meta" muted>
              Bu oturumda tema URL parametresiyle sabitlendi. Tercih kaydedilir ama sayfa
              yenilenene kadar URL geçerli olur.
            </AppText>
          </View>
        ) : null}

        {saveError ? (
          <View
            style={{
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: c.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.danger,
            }}
            accessibilityRole="alert"
          >
            <AppText variant="meta" style={{ color: c.danger }}>
              Tercih kaydedilemedi: {saveError}
            </AppText>
          </View>
        ) : null}

        <View style={{ gap: space.xs }}>
          <AppText variant="meta" muted style={{ letterSpacing: 1.2, fontWeight: '600' }}>
            ÖNİZLEME
          </AppText>

          <View
            style={{
              padding: space.md,
              gap: space.sm,
              borderRadius: radius.card,
              backgroundColor: c.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />
              <AppText variant="meta" style={{ color: c.accent, letterSpacing: 1.2 }}>
                MUST-DO
              </AppText>
            </View>

            <AppText variant="title">En önemli üç şey.</AppText>
            <AppText variant="body" muted>
              Şu an {dark ? 'koyu' : 'açık'} tema etkin. Metin, yüzey ve vurgu renkleri bu
              tercihe göre güncellenir.
            </AppText>

            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: c.surfaceRaised,
                overflow: 'hidden',
              }}
            >
              <View style={{ width: '62%', height: 6, backgroundColor: c.focus }} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
