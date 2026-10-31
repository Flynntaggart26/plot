import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { Sheen } from '@/ui/components/Sheen';
import { usePressScale } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';
import { darken, inkOn, lighten } from '@/ui/color';

/**
 * Odak ekranının birincil eylemi.
 *
 * Buton her zaman görünür ve tek bir iş yapar: başlat / duraklat.
 * Rengi moddan gelir; metin rengi zeminin parlaklığına göre seçilir,
 * böylece kullanıcı ne kadar açık bir halka rengi seçerse seçsin okunur kalır.
 */
export function StartButton({
  onPress,
  isRunning,
  isCompleted,
  mode,
  workColor,
  breakColor,
}: {
  onPress: () => void;
  isRunning: boolean;
  isCompleted: boolean;
  mode: 'work' | 'break';
  workColor: string;
  breakColor?: string;
}) {
  const { c, radius, space } = useTheme();
  const { style: pressStyle, handlers } = usePressScale();

  const color = mode === 'work' ? workColor : (breakColor ?? c.break);
  const ink = inkOn(color);

  const label = isCompleted
    ? mode === 'work'
      ? 'Molaya geç'
      : 'Çalışmaya dön'
    : isRunning
      ? 'Duraklat'
      : 'Başlat';

  const icon: keyof typeof Ionicons.glyphMap = isRunning
    ? 'pause'
    : isCompleted
      ? 'arrow-forward'
      : 'play';

  return (
    <Animated.View
      style={[
        pressStyle,
        {
          borderRadius: radius.pill,
          shadowColor: color,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.32,
          shadowRadius: 18,
          elevation: 6,
        },
      ]}
    >
      <Pressable
        {...handlers}
        onPress={() => {
          haptic(isRunning ? 'light' : 'medium');
          onPress();
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.xs,
          borderRadius: radius.pill,
          backgroundColor: color,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[lighten(color, 0.16), color, darken(color, 0.06)]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Sheen color={c.sheen} intensity={0.25} durationMs={1400} delayMs={900} />
        <View
          pointerEvents="none"
          style={[styles.edge, { backgroundColor: 'rgba(255,255,255,0.28)' }]}
        />
        <Ionicons name={icon} size={21} color={ink} />
        <AppText variant="bodyStrong" style={{ color: ink, fontSize: 16 }}>
          {label}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: StyleSheet.hairlineWidth * 2,
  },
});
