import React, { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AppText } from './Screen';
import { usePressScale, useReduceMotion } from '../motion/hooks';
import { haptic } from '@/lib/haptics';
import { duration, spring, stagger } from '@/ui/tokens';

type CaptureTarget = 'task' | 'note' | 'idea';

const TARGETS: {
  target: CaptureTarget;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Hafta 1'de yalnızca görev açık; not ve fikir ilgili haftalarda gelir. */
  available: boolean;
}[] = [
  {
    target: 'task',
    label: 'Görev',
    hint: 'Yapılacak bir şey',
    icon: 'checkbox-outline',
    available: true,
  },
  { target: 'note', label: 'Not', hint: 'Bir düşünce', icon: 'document-text-outline', available: false },
  {
    target: 'idea',
    label: 'Fikir',
    hint: 'Keşfedilecek yeni bir şey',
    icon: 'bulb-outline',
    available: false,
  },
];

/** Sheet genişliği üst sınırı: tablet ve web'de tam ekranı kaplamasın. */
const SHEET_MAX_WIDTH = 560;
/** Ölçüm gelmeden önce kullanılan kaba yükseklik (kapanış animasyonu için). */
const FALLBACK_HEIGHT = 420;
/** Her seçeneğin giriş süresi penceresi. */
const ENTER_WINDOW = 240;

/**
 * Yakalama sheet'i: FAB ile açılan tek giriş kapısı.
 *
 * RN `Modal` yerine sekme yığınının içinde mutlak konumlu bir katman:
 * - Android'de ayrı pencere açmadığı için sekme çubuğuyla aynı yüzeyde,
 *   geri tuşu ve durum çubuğu davranışı sürpriz üretmiyor.
 * - Katman her zaman monte; yalnızca `pointerEvents` ve `translateY` değişir.
 *   Bu sayede çıkış animasyonu görünür ve açılışta senkron setState gerekmez.
 * Yükseklik ölçülür; sistem fontu büyütülse bile sheet tamamen yukarı kayar.
 */
export function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();

  /** Ölçülen sheet yüksekliği (kapanış hedefi için). */
  const height = useSharedValue(FALLBACK_HEIGHT);
  /** Seçenek girişleri için 0→1 ilerleme. */
  const enter = useSharedValue(0);
  const y = useSharedValue(FALLBACK_HEIGHT + 40);
  const scrim = useSharedValue(0);

  useEffect(() => {
    if (open) {
      y.set(withSpring(0, spring.gentle));
      scrim.set(withTiming(1, { duration: reduced ? duration.fast : duration.in }));
      enter.set(0);
      enter.set(withTiming(1, { duration: reduced ? duration.fast : duration.slow }));
    } else {
      const hidden = Math.max(height.get(), FALLBACK_HEIGHT) + 40;
      y.set(withTiming(hidden, { duration: reduced ? duration.fast : duration.out }));
      scrim.set(withTiming(0, { duration: reduced ? duration.fast : duration.out }));
    }
  }, [open, reduced, enter, height, scrim, y]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.layer]}
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      aria-hidden={!open}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrimStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={open}
          focusable={open}
          tabIndex={open ? 0 : -1}
          accessibilityRole="button"
          accessibilityLabel="Yakalamayı kapat"
        />
      </Animated.View>

      <View style={styles.bottom} pointerEvents="box-none">
        <Animated.View
          onLayout={(event) => height.set(event.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            {
              backgroundColor: c.surfaceRaised,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              paddingHorizontal: space.lg,
              paddingTop: space.lg,
              paddingBottom: insets.bottom + space.xxl,
            },
            sheetStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          <View style={{ height: space.md }} />

          {TARGETS.map((target, index) => (
            <CaptureOption
              key={target.target}
              target={target}
              index={index}
              progress={enter}
              onClose={onClose}
              interactive={open}
            />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

function CaptureOption({
  target,
  index,
  progress,
  onClose,
  interactive,
}: {
  target: (typeof TARGETS)[number];
  index: number;
  progress: SharedValue<number>;
  onClose: () => void;
  interactive: boolean;
}) {
  const { c, space, radius } = useTheme();
  const { style: pressStyle, handlers } = usePressScale();
  const actionable = interactive && target.available;

  const enterStyle = useAnimatedStyle(() => {
    const start = (index * stagger.step) / duration.slow;
    const end = Math.min(start + ENTER_WINDOW / duration.slow, 1);
    const local = interpolate(progress.get(), [start, end], [0, 1], 'clamp');
    return {
      opacity: local,
      transform: [{ translateY: interpolate(local, [0, 1], [14, 0]) }],
    };
  });

  return (
    <Animated.View style={enterStyle}>
      <Animated.View style={pressStyle}>
        <Pressable
          {...handlers}
          onPress={() => {
            if (!actionable) return;
            haptic('light');
            onClose();
            router.push('/task/new');
          }}
          disabled={!actionable}
          focusable={actionable}
          tabIndex={actionable ? 0 : -1}
          accessible={interactive}
          accessibilityRole="button"
          accessibilityLabel={`${target.label}: ${
            target.available ? target.hint : 'yakında'
          }`}
          aria-disabled={!target.available}
          style={[
            styles.option,
            {
              backgroundColor: c.surface,
              borderRadius: radius.card,
              paddingHorizontal: space.md,
              paddingVertical: space.md,
              gap: space.sm,
              marginBottom: space.sm,
              opacity: target.available ? 1 : 0.5,
            },
          ]}
        >
          <View
            style={[styles.optionIcon, { backgroundColor: c.accentSoft, borderRadius: radius.sm }]}
          >
            <Ionicons name={target.icon} size={20} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{target.label}</AppText>
            <AppText variant="meta" muted>
              {target.available ? target.hint : 'Yakında'}
            </AppText>
          </View>
          {target.available ? (
            <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
          ) : (
            <AppText variant="meta" faint>
              Yakında
            </AppText>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 10,
    elevation: 10,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
