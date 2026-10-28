import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/ui/theme';

interface SelectWrapProps {
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function SelectWrap({ value, onChange, options, disabled, accessibilityLabel }: SelectWrapProps) {
  const { c } = useTheme();

  return (
    <View style={styles.wrap} accessibilityLabel={accessibilityLabel} accessible={true}>
      <select
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        style={styles.select}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <View style={styles.arrow} aria-hidden={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    flex: 1,
  },
  select: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingRight: 44,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  arrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    pointerEvents: 'none',
  },
});