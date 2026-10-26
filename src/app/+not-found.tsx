import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';
import { usePressScale } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';

/**
 * Bilinmeyen rota: derin bağlantı yanlış yazıldığında boş ekran yerine
 * tek bir çıkış kapısı sunar.
 */
export default function NotFoundScreen() {
  const { c, space, radius } = useTheme();
  const router = useRouter();
  const button = usePressScale();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Bulunamadı" />
      <View style={{ flex: 1, justifyContent: 'center', padding: space.lg, gap: space.sm }}>
        <AppText variant="title">Bu sayfa yok</AppText>
        <AppText variant="body" muted>
          Bağlantı eskimiş ya da yanlış yazılmış olabilir. Plot seni bugüne geri götürsün.
        </AppText>
        <Animated.View style={[button.style, { marginTop: space.sm }]}>
          <Pressable
            {...button.handlers}
            onPress={() => {
              haptic('tick');
              router.replace('/');
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Today ekranına dön"
            style={[
              styles.button,
              {
                height: 44,
                borderRadius: radius.pill,
                backgroundColor: c.accent,
                paddingHorizontal: space.lg,
              },
            ]}
          >
            <AppText variant="bodyStrong" style={{ color: c.bg }}>
              Today&apos;e dön
            </AppText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
