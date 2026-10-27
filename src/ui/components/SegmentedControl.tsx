import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
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

export function SegmentedControl({ value, onChange, segments }: SegmentedControlProps) {
  const { c } = useTheme();
  const activeIndex = segments.findIndex((s) => s.value === value);
  const indicatorX = useSharedValue(activeIndex);
  const containerWidth = useSharedValue(0);

  return (
    <View
      onLayout={(e) => { containerWidth.value = e.nativeEvent.layout.width; }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            transform: [
              { translateX: indicatorX.value * (containerWidth.value / segments.length) },
            ],
          },
        ]}
      />

      {segments.map((segment, index) => (
        <Pressable
          key={segment.value}
          onPress={() => {
            indicatorX.value = withSpring(index, spring.snappy);
            onChange(segment.value);
          }}
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
    backgroundColor: '#16161A',
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2A32',
    height: 40,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    backgroundColor: '#E8A33D',
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