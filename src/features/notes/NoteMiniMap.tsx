import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { AppText } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { useBacklinks } from '@/features/notes/queries';

type BacklinkDot = {
  id: string;
  title: string;
  x: number;
  y: number;
};

const MAP_SIZE = 150;
const CENTER_X = MAP_SIZE / 2;
const CENTER_Y = MAP_SIZE / 2;
const DOT_R = 5;
const CURRENT_DOT_R = 7;

/**
 * Not bağlantıları için küçük bir SVG mini-haritası.
 *
 * Merkezde o anki not (dolu daire), etrafında bağlı notlar (boş daire),
 * merkeze doğru çizgiler. Her noktaya tıklayarak ilgili nota geçiş yapılır.
 * Türkçe ipucu: "Bağlı notlar".
 */
export function NoteMiniMap({ noteId }: { noteId: string }) {
  const { c } = useTheme();
  const { data: backlinks } = useBacklinks(noteId);

  const dots = useMemo<BacklinkDot[]>(() => {
    if (!backlinks || backlinks.length === 0) return [];
    const result: BacklinkDot[] = [];
    const count = backlinks.length;
    const radius = MAP_SIZE / 3; // daire yarıçapı

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      result.push({
        id: backlinks[i].note.id,
        title: backlinks[i].note.title,
        x: CENTER_X + radius * Math.cos(angle),
        y: CENTER_Y + radius * Math.sin(angle),
      });
    }
    return result;
  }, [backlinks]);

  if (!dots.length) return null;

  return (
    <View style={styles.wrap}>
      <AppText variant="meta" faint style={styles.label}>
        Bağlı notlar
      </AppText>
      <View style={styles.mapContainer}>
        <Svg width={MAP_SIZE} height={MAP_SIZE}>
          {dots.map((dot) => (
            <Line
              key={`line-${dot.id}`}
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={dot.x}
              y2={dot.y}
              stroke={c.border}
              strokeWidth={1}
            />
          ))}
          {dots.map((dot, i) => (
            <Pressable
              key={`dot-${dot.id}`}
              onPress={() => {
                haptic('light');
              }}
              accessibilityRole="button"
              accessibilityLabel={`${dot.title} notuna git`}
              hitSlop={12}
            >
              <Circle
                cx={dot.x}
                cy={dot.y}
                r={DOT_R}
                fill={c.surfaceRaised}
                stroke={c.accent}
                strokeWidth={2}
              />
            </Pressable>
          ))}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={CURRENT_DOT_R}
            fill={c.accent}
          />
        </Svg>
        <View style={styles.overlay}>
          {dots.map((dot) => (
            <Pressable
              key={`overlay-${dot.id}`}
              onPress={() => {
                haptic('light');
              }}
              accessibilityRole="button"
              accessibilityLabel={`${dot.title} notuna git`}
              style={[
                styles.dotOverlay,
                {
                  left: dot.x - DOT_R - 4,
                  top: dot.y - DOT_R - 4,
                  width: DOT_R * 2 + 8,
                  height: DOT_R * 2 + 8,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  mapContainer: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    position: 'relative',
    marginHorizontal: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'box-none',
  },
  dotOverlay: {
    position: 'absolute',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
});
