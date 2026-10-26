import React from 'react';
import { View } from 'react-native';
import { Screen, ScreenIntro, AppText } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

/**
 * Focus: ekranda yalnızca görev + halka + süre.
 * Hafta 0: statik halka (Skia, hafta 3'te sıvı dolumuna dönüşecek).
 */
export default function FocusScreen() {
  const { c, radius } = useTheme();

  return (
    <Screen>
      <ScreenIntro eyebrow="NOW" title="Henüz bir görev seçilmedi" />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 240,
            height: 240,
            borderRadius: radius.pill,
            borderWidth: 10,
            borderColor: c.surfaceRaised,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="timer">25:00</AppText>
          <AppText variant="meta" muted>
            odak süresi
          </AppText>
        </View>
      </View>

      <AppText variant="meta" faint style={{ textAlign: 'center' }}>
        Odak başlatmak için Today&apos;den bir görev seç.
      </AppText>
    </Screen>
  );
}
