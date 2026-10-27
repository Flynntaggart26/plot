import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { alpha } from '../color';
import { useReduceMotion } from '../motion/hooks';

/**
 * Metal üzerinde kayan ışık.
 *
 * Yalnızca dekoratif: hiçbir bilgi taşımıyor, bu yüzden `reduce motion`
 * açıkken tamamen kaybolur. Ebeveyn `overflow: hidden` ile kırpmalı;
 * aksi halde bant dışarı taşar. `active` false→true olduğunda yeniden
 * başlar, böylece hover'da tek atımlık parlama mümkün.
 */
export function Sheen({
  color,
  intensity = 0.22,
  durationMs = 1500,
  delayMs = 1200,
  loop = true,
  active = true,
  angle = 16,
  style,
}: {
  color: string;
  /** Bandın tepe opaklığı — 0.1 çok ince, 0.4 belirgin. */
  intensity?: number;
  durationMs?: number;
  delayMs?: number;
  loop?: boolean;
  active?: boolean;
  /** Derece; negatif değer sağdan sola eğim verir. */
  angle?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReduceMotion();
  const width = useSharedValue(0);
  const progress = useSharedValue(0);
  const measured = useRef(0);

  const begin = useCallback(() => {
    progress.set(0);
    progress.set(
      withDelay(
        delayMs,
        withRepeat(
          withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.quad) }),
          loop ? -1 : 1,
          false,
        ),
      ),
    );
  }, [delayMs, durationMs, loop, progress]);

  // Görünür hâle gelince (veya hover başlayınca) bandı yeniden çalıştır.
  useEffect(() => {
    if (reduced || !active) {
      progress.set(0);
      return;
    }
    if (measured.current > 0) begin();
  }, [active, begin, progress, reduced]);

  const onLayout = (event: LayoutChangeEvent) => {
    measured.current = event.nativeEvent.layout.width;
    width.set(measured.current);
  };

  const bandStyle = useAnimatedStyle(() => {
    const w = width.get();
    return {
      width: Math.max(w * 0.55, 40),
      opacity: w > 0 ? intensity : 0,
      transform: [
        { translateX: interpolate(progress.get(), [0, 1], [-w * 0.7, w * 1.2]) },
        { rotate: `${angle}deg` },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.clip, reduced && styles.hidden, style]}
      onLayout={onLayout}
    >
      <Animated.View style={[styles.band, bandStyle]}>
        <LinearGradient
          colors={[alpha(color, 0), alpha(color, 0.9), alpha(color, 0)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  hidden: {
    opacity: 0,
  },
  band: {
    position: 'absolute',
    top: '-50%',
    height: '200%',
  },
});
