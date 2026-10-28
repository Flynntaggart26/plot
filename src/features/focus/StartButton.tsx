import React from 'react';
import { Pressable, View, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { useFocusStore } from './store';

interface StartButtonProps {
  onPress: () => void;
  isRunning: boolean;
  isCompleted: boolean;
  mode: 'work' | 'break';
  workColor: string;
}

export function StartButton({ onPress, isRunning, isCompleted, mode, workColor }: StartButtonProps) {
  const { c } = useTheme();
  
  const scale = useSharedValue(1);
  const bgColor = useSharedValue(mode === 'work' ? workColor : '#FF6B2E');
  
  React.useEffect(() => {
    bgColor.value = mode === 'work' ? workColor : '#FF6B2E';
  }, [mode, workColor]);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 150 });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bgColor.value,
  }));

  const iconName = isRunning ? 'pause-outline' : 'play-outline';
  const label = isCompleted ? (mode === 'work' ? 'Mola Başlat' : 'Devam Et') : (isRunning ? 'Duraklat' : 'Başlat');

  return (
    <Animated.View style={[styles.btn, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isCompleted}
        accessibilityLabel={isRunning ? 'Duraklat' : 'Başlat'}
        android_ripple={{ color: '#FFFFFF33' }}
      >
        <Ionicons name={iconName} size={24} color={c.bg} style={styles.icon} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    boxShadow: '0 4px 20px rgba(232, 163, 61, 0.3)',
  },
  pressed: {
    opacity: 0.9,
  },
  icon: {
    marginBottom: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});