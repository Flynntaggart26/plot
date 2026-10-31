import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { haptic } from '@/lib/haptics';
import { alpha } from '@/ui/color';
import { spring } from '@/ui/tokens';

/**
 * Çalışma / Mola seçici.
 *
 * Gösterge, seçili modun rengiyle yumuşak bir zemin olarak kayar; metin
 * rengi de aynı rengi alır. Emoji yok: ikonlar cihazlar arasında aynı
 * çizilir ve ekran okuyucu "ateş" demez.
 */
export function ModeToggle({
  mode,
  onChange,
  workColor,
  breakColor,
}: {
  mode: 'work' | 'break';
  onChange: (mode: 'work' | 'break') => void;
  workColor: string;
  breakColor: string;
}) {
  const { c, radius } = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(mode === 'work' ? 0 : 1);

  useEffect(() => {
    progress.set(withSpring(mode === 'work' ? 0 : 1, spring.snappy));
  }, [mode, progress]);

  const segmentWidth = width > 0 ? (width - 8) / 2 : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: progress.get() * segmentWidth }],
  }));

  const activeColor = mode === 'work' ? workColor : breakColor;

  const option = (target: 'work' | 'break', label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const active = mode === target;
    return (
      <Pressable
        onPress={() => {
          if (active) return;
          haptic('tick');
          onChange(target);
        }}
        accessibilityRole="radio"
        aria-checked={active}
        accessibilityLabel={label}
        style={[styles.option, { cursor: 'pointer' }]}
      >
        <Ionicons
          name={icon}
          size={15}
          color={active ? activeColor : c.textFaint}
        />
        <AppText
          variant="meta"
          style={{
            color: active ? activeColor : c.textMuted,
            fontWeight: active ? '600' : '500',
          }}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderRadius: radius.pill,
          padding: 4,
        },
      ]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Odak modu"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            backgroundColor: alpha(activeColor, 0.14),
            borderColor: alpha(activeColor, 0.4),
            borderRadius: radius.pill,
          },
          indicatorStyle,
        ]}
      />
      {option('work', 'Çalışma', 'briefcase-outline')}
      {option('break', 'Mola', 'cafe-outline')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
  },
});
