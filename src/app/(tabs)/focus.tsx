// @ts-nocheck
import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { spring, glow } from '@/ui/tokens';
import { usePressScale } from '@/ui/motion/hooks';

const AnimatedCircle = Animated.createAnimatedComponent(Circle) as React.ComponentType<
  React.ComponentProps<typeof Circle> & { style?: any }
>;

const { width } = Dimensions.get('window');
const RING_SIZE = Math.min(width - 64, 320);
const RING_THICKNESS = 16;
const RING_CX = RING_SIZE / 2;
const RING_CY = RING_SIZE / 2;
const RING_R = (RING_SIZE - RING_THICKNESS - 24) / 2;
const FULL_DASH = 2 * Math.PI * RING_R;

/**
 * Odak ekranı — Pomodoro tarzı geri sayım timer.
 *
 * - Animasyonlu SVG halka (Reanimated shared value ile)
 * - Başlat / Durdur / Sıfırla
 * - Odak aktifken arkaplan pulse (ıslık) verir
 * - Tamamlandığında başarı haptigi ve parlaklık artar
 */
export default function FocusScreen() {
  const { c, space, radius } = useTheme();
  const { style: pressStyle, handlers } = usePressScale();

  const [isActive, setIsActive] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const timeLeft = useSharedValue(25 * 60); // 25 dakika
  const progress = useSharedValue(1); // 1 → 0 (dolu → boş)

  const ringProgress = interpolate(progress.value, [0, 1], [FULL_DASH, 0]);
  const ringColor = interpolate(progress.value, [0, 1], [c.focus, c.accent]);

  const ringStyle = useAnimatedStyle(() => ({
    strokeDashoffset: ringProgress,
  }));

  const pulseOpacity = useSharedValue(0.35);

  const pulseStyle = useAnimatedStyle(() => ({
    shadowOpacity: pulseOpacity.value,
  }));

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startTimer = useCallback(() => {
    if (isActive) return;
    haptic('medium');
    setIsActive(true);
    setIsCompleted(false);

    let last = Date.now();
    const tick = () => {
      if (!isActive) return;
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;

      timeLeft.value = Math.max(0, timeLeft.value - delta);
      progress.value = timeLeft.value / (25 * 60);
      pulseOpacity.value = 0.35 + 0.25 * Math.sin(Date.now() / 400);

      if (timeLeft.value > 0) {
        requestAnimationFrame(tick);
      } else {
        setIsActive(false);
        setIsCompleted(true);
        haptic('success');
        progress.value = withSpring(0, spring.snappy);
        pulseOpacity.value = 0.35;
      }
    };
    requestAnimationFrame(tick);
  }, [isActive, timeLeft, progress, pulseOpacity]);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
    haptic('light');
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setIsCompleted(false);
    // eslint-disable-next-line react-hooks/immutability
    timeLeft.value = 25 * 60;
    // eslint-disable-next-line react-hooks/immutability
    progress.value = withSpring(1, spring.snappy);
    // eslint-disable-next-line react-hooks/immutability
    pulseOpacity.value = 0.35;
    haptic('tick');
  }, [timeLeft, progress, pulseOpacity]);

  const containerStyle = {
    flex: 1,
    backgroundColor: c.bg,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  };

  const glowBackgroundStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 400,
    ...(isActive && {
      ...glow.strong,
      backgroundColor: c.focusSoft,
    }),
  };

  const contentStyle = {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: space.xl,
  };

  const headerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: space.sm,
    marginBottom: space.sm,
  };

  const titleStyle = {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  };

  const subtitleStyle = {
    fontSize: 13,
  };

  const ringContainerStyle = {
    position: 'relative' as const,
    width: RING_SIZE,
    height: RING_SIZE,
  };

  const centerStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const timerStyle = {
    fontSize: 56,
    fontWeight: '300' as const,
    letterSpacing: -2,
    lineHeight: 64,
  };

  const timerLabelStyle = {
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 0.4,
  };

  const actionsStyle = {
    flexDirection: 'row' as const,
    gap: space.md,
    marginTop: space.lg,
  };

  const actionButtonStyle = {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...glow.medium,
    backgroundColor: c.accent,
  };

  const successBannerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: c.surfaceRaised,
    borderWidth: 1,
    borderColor: c.focus,
    marginTop: space.lg,
  };

  const successTextStyle = {
    fontSize: 14,
    fontWeight: '500' as const,
  };

  return (
    <View style={containerStyle}>
      {/* Işık arkaplanı — odaktayken parlıyor */}
      <Animated.View
        style={[{ ...styles.glowBackground }, pulseStyle, glowBackgroundStyle]}
        pointerEvents="none"
      />

      <View style={contentStyle}>
        <View style={headerStyle}>
          <Ionicons
            name="aperture"
            size={24}
            color={isActive ? c.focus : c.textMuted}
          />
          <Text style={[styles.title, titleStyle, { color: isActive ? c.focus : c.text }]}>
            {isActive ? 'Odakta' : 'Odak'}
          </Text>
          <Text style={[styles.subtitle, subtitleStyle, { color: c.textMuted }]}>
            {isCompleted
              ? 'Odak süresi tamamlandı!'
              : isActive
                ? 'Geri sayım devam ediyor'
                : '25 dakikalık odak bloğu'}
          </Text>
        </View>

        {/* Animasyonlu timer halka */}
        <View style={ringContainerStyle}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Arka halka */}
            <Circle
              cx={RING_CX}
              cy={RING_CY}
              r={RING_R}
              fill="none"
              stroke={c.border}
              strokeWidth={RING_THICKNESS}
              strokeLinecap="round"
            />
            {/* İlerleme halkası */}
            <AnimatedCircle
              cx={RING_CX}
              cy={RING_CY}
              r={RING_R}
              fill="none"
              stroke={ringColor}
              strokeWidth={RING_THICKNESS}
              strokeLinecap="round"
              style={ringStyle}
            />
          </Svg>

          {/* Merkez zaman */}
          <View style={centerStyle}>
            <Text style={[styles.timer, timerStyle, { color: isActive ? c.focus : c.text }]}>
              {formatTime(timeLeft.value)}
            </Text>
            <Text style={[styles.timerLabel, timerLabelStyle, { color: c.textMuted }]}>
              dakika
            </Text>
          </View>
        </View>

        {/* Kontrol butonları */}
        <View style={actionsStyle}>
          <Pressable
            {...handlers}
            style={[pressStyle, actionButtonStyle]}
            onPress={isActive ? pauseTimer : startTimer}
            disabled={isCompleted}
            accessibilityLabel={isActive ? 'Durdur' : 'Başlat'}
          >
            <Ionicons
              name={isActive ? 'pause-outline' : 'play-outline'}
              size={26}
              color={c.bg}
            />
          </Pressable>

          <Pressable
            {...handlers}
            style={[pressStyle, actionButtonStyle]}
            onPress={resetTimer}
            accessibilityLabel="Sıfırla"
          >
            <Ionicons name="refresh-outline" size={22} color={c.textMuted} />
          </Pressable>
        </View>

        {isCompleted && (
          <View style={successBannerStyle}>
            <Ionicons name="checkmark-circle" size={20} color={c.focus} />
            <Text style={[styles.successText, successTextStyle, { color: c.focus }]}>
              Odak hedefine ulaştın. Mola vermeye hazır mısın?
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = {
  container: { flex: 1 },
  glowBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 400,
  },
  title: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.2 },
  subtitle: { fontSize: 13 },
  timer: {
    fontSize: 56,
    fontWeight: '300' as const,
    letterSpacing: -2,
    lineHeight: 64,
  },
  timerLabel: { fontSize: 14, marginTop: 4, letterSpacing: 0.4 },
  successText: { fontSize: 14, fontWeight: '500' as const },
};