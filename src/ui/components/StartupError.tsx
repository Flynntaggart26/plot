import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './Screen';

/**
 * Açılışta veritabanı hazırlanamazsa gösterilir.
 * Sessiz boot ekranında asılı kalmak yerine ne olduğunu söyler.
 */
export function StartupError({ message }: { message?: string }) {
  const { c, space } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space.xl,
        gap: space.xs,
      }}
    >
      <AppText variant="title" style={{ textAlign: 'center' }}>
        Veritabanı açılamadı
      </AppText>
      <AppText variant="body" muted style={{ textAlign: 'center' }}>
        Plot yerel verilerini hazırlayamadı. Uygulamayı kapatıp yeniden açmayı dene.
      </AppText>
      {message ? (
        <AppText variant="meta" faint style={{ textAlign: 'center', marginTop: space.sm }}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}
