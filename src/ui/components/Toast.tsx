import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AppText } from './Screen';
import { useReduceMotion } from '../motion/hooks';
import { useToastStore, type ToastTone } from '@/lib/toast';
import { alpha } from '../color';
import { duration, glow, radius, space } from '../tokens';

const TOAST_MS = 2600;

const TONE: Record<ToastTone, { icon: keyof typeof Ionicons.glyphMap; tint: (c: ReturnType<typeof useTheme>['c']) => string }> = {
  success: { icon: 'checkmark-circle', tint: (c) => c.focus },
  info: { icon: 'information-circle', tint: (c) => c.accent },
  error: { icon: 'alert-circle', tint: (c) => c.danger },
};

/**
 * Alt bildirim. Sekme çubuğunun üstünde belirir; kapanış kendiliğinden.
 * Altta ince bir çizgi geri sayımı gösterir — süre sürpriz olmaz.
 */
export function ToastHost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const toast = useToastStore((state) => state.toast);
  const hide = useToastStore((state) => state.hide);
  const remaining = useSharedValue(1);

  useEffect(() => {
    if (!toast) return;
    remaining.set(1);
    remaining.set(withTiming(0, { duration: TOAST_MS, easing: Easing.linear }));
    const timer = setTimeout(hide, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, hide, remaining]);

  const barStyle = useAnimatedStyle(() => ({ width: `${remaining.get() * 100}%` }));

  const tone = toast ? TONE[toast.tone] : null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        pointerEvents="box-none"
        style={[styles.layer, { bottom: insets.bottom + 126 }]}
        accessibilityLiveRegion="polite"
        aria-live="polite"
      >
        {toast && tone ? (
          <Animated.View
            key={toast.id}
            entering={
              reduced ? FadeIn.duration(duration.fast) : FadeInDown.springify().damping(18).stiffness(220)
            }
            exiting={reduced ? FadeOut.duration(duration.fast) : FadeOutDown.duration(duration.out)}
            accessibilityRole="alert"
            style={[
              styles.toast,
              glow.soft,
              {
                backgroundColor: c.surfaceRaised,
                borderColor: c.border,
                borderRadius: radius.pill,
                paddingHorizontal: space.md,
                gap: space.xs,
              },
            ]}
          >
            <Ionicons name={tone.icon} size={18} color={tone.tint(c)} />
            <AppText variant="bodyStrong" numberOfLines={2} style={{ flexShrink: 1 }}>
              {toast.message}
            </AppText>

            <View
              pointerEvents="none"
              style={[
                styles.bar,
                { backgroundColor: alpha(tone.tint(c), 0.35) },
              ]}
            >
              <Animated.View
                style={[styles.barFill, { backgroundColor: tone.tint(c) }, barStyle]}
              />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    alignItems: 'center',
  },
  toast: {
    maxWidth: 420,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingVertical: space.sm,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
  },
  barFill: {
    height: 2,
  },
});
