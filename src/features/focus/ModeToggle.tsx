import React from 'react';
import { Pressable, View, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/ui/theme';

interface ModeToggleProps {
  mode: 'work' | 'break';
  onChange: (mode: 'work' | 'break') => void;
  workColor: string;
  breakColor: string;
}

export function ModeToggle({ mode, onChange, workColor, breakColor }: ModeToggleProps) {
  const { c } = useTheme();
  
  const activeMode = useSharedValue(mode === 'work' ? 0 : 1);
  
  React.useEffect(() => {
    activeMode.value = mode === 'work' ? 0 : 1;
  }, [mode]);

  const indicatorStyle = useAnimatedStyle(() => {
    const translateX = activeMode.value === 0 ? 4 : 4 + 100; // 4 padding + ~100 button width
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, mode === 'work' && styles.activeWork, mode === 'break' && styles.activeBreak]}
        onPress={() => onChange('work')}
        accessibilityRole="radio"
        aria-checked={mode === 'work'}
        android_ripple={{ color: `${workColor}33` }}
      >
        <Text style={[styles.btnText, mode === 'work' && styles.activeText]}>🔥 Çalışma</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, mode === 'break' && styles.activeBreak]}
        onPress={() => onChange('break')}
        accessibilityRole="radio"
        aria-checked={mode === 'break'}
        android_ripple={{ color: `${breakColor}33` }}
      >
        <Text style={[styles.btnText, mode === 'break' && styles.activeText]}>☕ Mola</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#2A2A30',
    borderRadius: 14,
    padding: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    width: '50%',
    borderRadius: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  btnPressed: {
    opacity: 0.8,
  },
  activeWork: {
    backgroundColor: '#E8A33D',
  },
  activeBreak: {
    backgroundColor: '#FF6B2E',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A948C',
  },
  activeText: {
    color: '#0E0E10',
  },
});