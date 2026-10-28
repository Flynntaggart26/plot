import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ColorButtonProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function ColorButton({ value, onChange, label, disabled, accessibilityLabel }: ColorButtonProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[
          styles.btn,
          disabled && styles.disabled,
          { backgroundColor: value },
        ]}
        onPress={() => !disabled && onChange(value)}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel || `${label} rengi, ${value}`}
        accessibilityRole="button"
        android_ripple={disabled ? undefined : { color: '#FFFFFF33' }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => !disabled && onChange(e.target.value)}
          disabled={disabled}
          style={styles.hiddenInput}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2A2A30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
    borderColor: '#3A3A44',
  },
  hiddenInput: {
    position: 'absolute',
    inset: 0,
    opacity: 0,
    width: '100%',
    height: '100%',
  },
});