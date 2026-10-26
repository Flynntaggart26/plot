import React from 'react';
import { View } from 'react-native';
import { Screen, ScreenIntro } from '@/ui/components/Screen';
import { EmptyState } from '@/ui/components/EmptyState';
import { useTheme } from '@/ui/theme';

/**
 * Tangent: fikir kıvılcımı.
 * İki giriş yolu: serbest döküm ve kısıtlı üretim. Hafta 7'de gelir.
 */
export default function TangentScreen() {
  const { c, space, radius } = useTheme();

  return (
    <Screen>
      <ScreenIntro title="Tangent" subtitle="Kafamda döneni buraya dök." />

      <View
        style={{
          flex: 1,
          marginTop: space.md,
          borderRadius: radius.card,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          padding: space.md,
        }}
      >
        <EmptyState
          headline="Aklını bomboş bırak"
          hint="Karışık yaz. Temalar buraya kümelenecek; fikirler karta dönüşecek."
        />
      </View>
    </Screen>
  );
}
