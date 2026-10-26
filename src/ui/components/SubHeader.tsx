import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useTheme } from '../theme';
import { AppText } from './Screen';
import { usePressScale } from '../motion/hooks';
import { haptic } from '@/lib/haptics';

/**
 * İkincil ekranlar için ortak üst çubuk: sol geri, sağ aksiyon (opsiyonel).
 */
export function SubHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { c, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const back = usePressScale();

  return (
    <View
      style={{
        paddingTop: insets.top + space.xs,
        paddingHorizontal: space.lg,
        paddingBottom: space.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        backgroundColor: c.bg,
      }}
    >
      <Animated.View style={back.style}>
        <Pressable
          {...back.handlers}
          onPress={() => {
            haptic('tick');
            // Derin bağlantıyla gelindiyse geçmiş yoktur: köke düş.
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Geri"
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            backgroundColor: c.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </Pressable>
      </Animated.View>

      <View style={{ flex: 1 }}>
        <AppText variant="section" style={{ color: c.text }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="meta" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right}
    </View>
  );
}

/**
 * Yol haritasında sonraki haftalarda kurulacak ekranlar için
 * geçici durak. Yerine gelene kadar sade ve sessiz durur.
 */
export function WipScreen({ title, note }: { title: string; note?: string }) {
  const { c, space } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title={title} />
      <View style={{ flex: 1, justifyContent: 'center', padding: space.lg }}>
        <AppText variant="body" muted>
          {note ?? 'Bu ekran plana göre ilerleyen haftalarda kurulacak.'}
        </AppText>
      </View>
    </View>
  );
}
