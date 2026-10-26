import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../theme';
import { AppText } from './Screen';
import { usePressScale } from '../motion/hooks';
import { haptic } from '@/lib/haptics';

/**
 * Seçilebilir etiket. Seçim tek renkle değil, zemin + çerçeve + metin
 * üçlüsüyle anlatılır: renk körlüğünde de ayırt edilebilir.
 */
export function Chip({
  label,
  selected,
  onPress,
  role = 'button',
  disabled = false,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: 'button' | 'radio' | 'checkbox';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { c, radius, space } = useTheme();
  const { style: pressStyle, handlers } = usePressScale(disabled);

  return (
    <Animated.View style={[pressStyle, style]}>
      <Pressable
        {...handlers}
        onPress={() => {
          if (disabled) return;
          haptic('tick');
          onPress();
        }}
        disabled={disabled}
        accessible
        accessibilityRole={role}
        accessibilityLabel={label}
        aria-selected={role === 'button' ? selected : undefined}
        aria-checked={role === 'button' ? undefined : selected}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? c.accentSoft : c.surface,
            borderColor: selected ? c.accent : c.border,
            borderRadius: radius.pill,
            paddingHorizontal: space.md,
          },
        ]}
      >
        <AppText variant="meta" style={{ color: selected ? c.accent : c.textMuted }}>
          {label}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
