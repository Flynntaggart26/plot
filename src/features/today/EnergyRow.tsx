import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { usePressScale, useReduceMotion } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';
import { alpha } from '@/ui/color';
import { glow, spring } from '@/ui/tokens';

const LEVEL_LABEL = ['Tükenmiş', 'Düşük', 'Orta', 'İyi', 'Yüksek'];

/**
 * Güne kendi başlangıç noktasını seçmek, planın girdisidir.
 * Seçim `daily_plans`'a yazılır; yarın sıfırdan başlar.
 */
export function EnergyRow({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange: (level: number) => void;
  disabled?: boolean;
}) {
  const { c, space } = useTheme();

  return (
    <View style={{ marginTop: space.md }}>
      <View style={styles.header}>
        <AppText variant="meta" muted style={{ letterSpacing: 1.2 }}>
          BUGÜNKÜ ENERJİ
        </AppText>
        <AppText variant="meta" style={{ color: value ? c.accent : c.textFaint }}>
          {value ? LEVEL_LABEL[value - 1] : 'Seçilmedi'}
        </AppText>
      </View>

      <View
        style={{ flexDirection: 'row', gap: space.xs, marginTop: space.xs }}
        accessibilityRole="radiogroup"
        accessibilityLabel="Bugünkü enerji"
      >
        {[1, 2, 3, 4, 5].map((level) => (
          <EnergyPill
            key={level}
            level={level}
            selected={value === level}
            disabled={disabled}
            onSelect={() => onChange(level)}
          />
        ))}
      </View>
    </View>
  );
}

function EnergyPill({
  level,
  selected,
  disabled,
  onSelect,
}: {
  level: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { c, radius } = useTheme();
  const reduced = useReduceMotion();
  const { style, handlers } = usePressScale(disabled);
  const selectedProgress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      selectedProgress.set(selected ? 1 : 0);
      return;
    }
    selectedProgress.set(withSpring(selected ? 1 : 0, spring.snappy));
  }, [reduced, selected, selectedProgress]);

  // Seçim tek renkle değil, zemin + çerçeve + çok hafif büyümeyle anlatılır.
  const pillStyle = useAnimatedStyle(() => {
    const p = selectedProgress.get();
    return {
      backgroundColor: interpolateColor(p, [0, 1], [c.surface, c.accentSoft]),
      borderColor: interpolateColor(p, [0, 1], [c.border, c.accent]),
      transform: [{ scale: 1 + p * 0.015 }],
    };
  });

  const haloStyle = useAnimatedStyle(() => ({
    opacity: selectedProgress.get() * 0.9,
    transform: [{ scale: 0.94 + selectedProgress.get() * 0.06 }],
  }));

  return (
    <Animated.View style={[styles.pillWrap, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          glow.soft,
          { backgroundColor: alpha(c.accent, 0.16), borderRadius: radius.pill },
          haloStyle,
        ]}
      />
      <Pressable
        {...handlers}
        onPress={() => {
          haptic('tick');
          onSelect();
        }}
        disabled={disabled}
        accessible
        accessibilityRole="radio"
        accessibilityLabel={`Enerji ${level} / 5, ${LEVEL_LABEL[level - 1]}`}
        aria-checked={selected}
        aria-disabled={disabled}
        style={[styles.pill, { borderRadius: radius.pill, cursor: 'pointer' }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth }, pillStyle]}
        />
        <AppText variant="meta" muted={!selected} style={selected ? { color: c.accent } : undefined}>
          {'•'.repeat(level)}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillWrap: {
    flex: 1,
  },
  halo: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: -2,
    right: -2,
  },
  pill: {
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
