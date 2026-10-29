import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/ui/theme';
import { alpha } from '@/ui/color';
import { AppText } from '@/ui/components/Screen';
import type { DailyActivity } from './service';
import { localDayKey } from '@/lib/date';

/**
 * Etkinlik grafiği.
 *
 * Çubuk yüksekliği o günün toplam etkinliğini taşır (odak dakikası + görev).
 * Sıfır günler kaybolmaz: ince bir taban çizgisi kalır, böylece "boş gün"
 * ile "veri yok" birbirine karışmaz. Seçili gün dokunarak değiştirilir;
 * ayrıntı ekranın üstünde tek satırda okunur.
 */
export function ActivityChart({
  points,
  selectedKey,
  onSelect,
}: {
  points: DailyActivity[];
  selectedKey: string | null;
  onSelect: (dayKey: string) => void;
}) {
  const { c, space, radius } = useTheme();
  const todayKey = localDayKey();
  const max = Math.max(...points.map((point) => point.total), 1);
  const dense = points.length > 14;

  return (
    <View>
      <View
        style={styles.bars}
        accessibilityRole="summary"
        accessibilityLabel="Günlük etkinlik grafiği"
      >
        {points.map((point) => {
          const selected = point.dayKey === selectedKey;
          const hasActivity = point.total > 0;
          const height = hasActivity ? 8 + Math.round((point.total / max) * 92) : 4;

          return (
            <Pressable
              key={point.dayKey}
              onPress={() => onSelect(point.dayKey)}
              style={styles.barSlot}
              accessibilityRole="button"
              accessibilityLabel={`${point.weekday}: ${point.focusMinutes} dakika odak, ${point.tasksDone} görev`}
              aria-selected={selected}
            >
              <View
                style={{
                  width: '100%',
                  height,
                  borderRadius: Math.min(radius.sm, 6),
                  backgroundColor: selected
                    ? c.accent
                    : hasActivity
                      ? alpha(c.accent, 0.42)
                      : c.border,
                }}
              />
              <View
                style={{
                  marginTop: 3,
                  width: 3,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor:
                    point.tasksDone > 0 ? (selected ? c.accent : c.focus) : 'transparent',
                }}
              />
              {point.dayKey === todayKey ? (
                <View
                  style={{
                    marginTop: 3,
                    width: 3,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: c.textFaint,
                  }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.labels, { marginTop: space.xxs }]}>
        {points.map((point, index) => {
          const show = !dense || index === 0 || index === points.length - 1 || index % 5 === 0;
          return (
            <View key={point.dayKey} style={styles.labelSlot}>
              {show ? (
                <AppText variant="meta" faint style={{ fontSize: 10 }}>
                  {dense ? point.dayKey.slice(8) : point.weekday}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 112,
    gap: 3,
  },
  barSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    cursor: 'pointer',
  },
  labels: {
    flexDirection: 'row',
    gap: 3,
  },
  labelSlot: {
    flex: 1,
    alignItems: 'center',
  },
});
