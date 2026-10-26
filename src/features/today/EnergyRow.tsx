import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { usePressScale } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';

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
  const { style, handlers } = usePressScale(disabled);

  return (
    <Animated.View style={[styles.pillWrap, style]}>
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
        style={[
          styles.pill,
          {
            borderRadius: radius.pill,
            backgroundColor: selected ? c.accentSoft : c.surface,
            borderColor: selected ? c.accent : c.border,
          },
        ]}
      >
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
  pill: {
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
