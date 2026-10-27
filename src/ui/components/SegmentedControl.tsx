import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { radius, spring } from '../tokens';

interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  segments: { value: string; label: string }[];
}

/**
 * Eşit genişlikte segment seçici. Gösterge konumu React state yerine
 * shared value ile ilerler; genişlik ölçümü de state'e yazılır çünkü
 * shared value tek başına yeniden render tetiklemez.
 */
export function SegmentedControl({ value, onChange, segments }: SegmentedControlProps) {
  const { c } = useTheme();
  const activeIndex = Math.max(
    0,
    segments.findIndex((s) => s.value === value),
  );
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(activeIndex);

  useEffect(() => {
    progress.set(withSpring(activeIndex, spring.snappy));
  }, [activeIndex, progress]);

  const segmentWidth = width > 0 ? (width - 6) / segments.length : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: progress.get() * segmentWidth }],
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.container, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <Animated.View
        style={[styles.indicator, { backgroundColor: c.accent }, indicatorStyle]}
      />

      {segments.map((segment, index) => (
        <Pressable
          key={segment.value}
          onPress={() => onChange(segment.value)}
          style={styles.segment}
          accessibilityRole="button"
          aria-selected={index === activeIndex}
          aria-label={segment.label}
        >
          <Animated.Text
            style={[
              styles.segmentText,
              {
                color: index === activeIndex ? c.bg : c.textMuted,
              },
            ]}
          >
            {segment.label}
          </Animated.Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: radius.pill,
    shadowColor: '#E8A33D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
