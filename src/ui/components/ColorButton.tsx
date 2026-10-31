import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { inkOn } from '../color';

/**
 * Tek renk yuvası. Seçili yuva kalın çerçeve + tik ile anlatılır;
 * yalnızca renge güvenilmez, renk körlüğünde de ayırt edilir.
 */
export function ColorButton({
  value,
  selected,
  onPress,
  label,
  disabled = false,
}: {
  value: string;
  selected: boolean;
  onPress: () => void;
  label: string;
  disabled?: boolean;
}) {
  const { c } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={label}
      style={[
        styles.swatch,
        {
          backgroundColor: value,
          borderColor: selected ? c.text : c.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'auto' : 'pointer',
        },
      ]}
    >
      {selected ? <Ionicons name="checkmark" size={17} color={inkOn(value)} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
