import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/ui/theme';
import { useReduceMotion } from '@/ui/motion/hooks';

interface SessionDotsProps {
  totalSessions: number;
  completedWorkSessions: number;
  isRunning: boolean;
  mode: 'work' | 'break';
  outerColor: string;
  breakOuterColor: string;
}

/**
 * Oturum göstergesi: dolu = bitmiş, nabız atan = şu anki, boş = sırada.
 * Yalnızca güncel nokta büyür; hepsinin oynaması hangi oturumda olduğunu
 * bulanıklaştırırdı.
 */
export function SessionDots({
  totalSessions,
  completedWorkSessions,
  isRunning,
  mode,
  outerColor,
  breakOuterColor,
}: SessionDotsProps) {
  const { c } = useTheme();
  const reduced = useReduceMotion();
  const isWork = mode === 'work';
  const activeColor = isWork ? outerColor : breakOuterColor;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      pulse.set(1);
      return;
    }
    if (isRunning && isWork) {
      pulse.set(
        withRepeat(
          withSequence(
            withTiming(1.22, { duration: 750, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
        ),
      );
      return;
    }
    pulse.set(withTiming(1, { duration: 160 }));
  }, [isRunning, isWork, pulse, reduced]);

  const dots = useMemo(
    () =>
      Array.from({ length: totalSessions }, (_, index) => ({
        isCompleted: index < completedWorkSessions,
        isCurrent: index === completedWorkSessions && isRunning,
      })),
    [totalSessions, completedWorkSessions, isRunning],
  );

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${completedWorkSessions} / ${totalSessions} oturum tamamlandı`}
    >
      {dots.map((dot, index) => (
        <Dot
          key={index}
          completed={dot.isCompleted}
          current={dot.isCurrent}
          pulse={pulse}
          color={dot.isCompleted ? outerColor : dot.isCurrent ? activeColor : c.border}
        />
      ))}
    </View>
  );
}

function Dot({
  completed,
  current,
  pulse,
  color,
}: {
  completed: boolean;
  current: boolean;
  pulse: ReturnType<typeof useSharedValue<number>>;
  color: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: current ? pulse.get() : 1 }],
    backgroundColor: completed ? color : 'transparent',
    borderColor: color,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});
