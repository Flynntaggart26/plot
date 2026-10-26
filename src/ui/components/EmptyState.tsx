import React from 'react';
import { View, ViewStyle } from 'react-native';
import { AppText } from './Screen';
import { useTheme } from '../theme';

/**
 * Boş durumlar her ekranda aynı anlatır: ne burada listelenecek,
 * neden şu an boş, ilk eylem ne. Tek satır önyargı, suçluluk yok.
 */
export function EmptyState({
  icon,
  headline,
  hint,
  action,
  style,
}: {
  icon?: React.ReactNode;
  headline: string;
  hint?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { c, space } = useTheme();
  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space.xl,
          gap: space.xs,
        },
        style,
      ]}
    >
      {icon ? <View style={{ marginBottom: space.xs }}>{icon}</View> : null}
      <AppText variant="section" style={{ textAlign: 'center', color: c.textMuted }}>
        {headline}
      </AppText>
      {hint ? (
        <AppText variant="body" muted style={{ textAlign: 'center' }}>
          {hint}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: space.sm, width: 240 }}>{action}</View> : null}
    </View>
  );
}
