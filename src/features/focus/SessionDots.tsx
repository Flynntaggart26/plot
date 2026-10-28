import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/ui/theme';

interface SessionDotsProps {
  totalSessions: number;
  completedWorkSessions: number;
  isRunning: boolean;
  mode: 'work' | 'break';
  outerColor: string;
  breakOuterColor: string;
}

interface SessionDotProps {
  isCompleted: boolean;
  isCurrent: boolean;
  pulse: ReturnType<typeof useSharedValue<number>>;
  outerColor: string;
  activeColor: string;
  borderColor: string;
  c: ReturnType<typeof useTheme>['c'];
}

function SessionDot({ isCompleted, isCurrent, pulse, outerColor, activeColor, borderColor, c }: SessionDotProps) {
  const bgColor = isCompleted ? outerColor : 'transparent';
  const bColor = isCompleted ? outerColor : borderColor;
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    backgroundColor: bgColor,
    borderColor: bColor,
  }), [isCompleted, borderColor, outerColor, bgColor, bColor]);

  return (
    <Animated.View style={[styles.dot, animatedStyle]} />
  );
}

export function SessionDots({
  totalSessions,
  completedWorkSessions,
  isRunning,
  mode,
  outerColor,
  breakOuterColor,
}: SessionDotsProps) {
  const { c } = useTheme();
  const isWork = mode === 'work';
  const activeColor = isWork ? outerColor : breakOuterColor;

  // Pulse animation for current dot
  const pulse = useSharedValue(1);
  React.useEffect(() => {
    if (isRunning && isWork) {
      pulse.value = withTiming(1.15, { duration: 750, easing: Easing.inOut(Easing.ease) }, () => {
        pulse.value = withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) });
      });
    }
  }, [isRunning, isWork, pulse]);

  const dots = React.useMemo(() => 
    Array.from({ length: totalSessions }, (_, i) => {
      const isCompleted = i < completedWorkSessions;
      const isCurrent = i === completedWorkSessions && isRunning && isWork;
      
      return { isCompleted, isCurrent };
    }), [totalSessions, completedWorkSessions, isRunning, isWork]);

  return (
    <View style={styles.container}>
      {dots.map(({ isCompleted, isCurrent }, i) => (
        <SessionDot
          key={i}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
          pulse={pulse}
          outerColor={outerColor}
          activeColor={activeColor}
          borderColor={isCompleted ? outerColor : (isCurrent ? activeColor : c.border)}
          c={c}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});