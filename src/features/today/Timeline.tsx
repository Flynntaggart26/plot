import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { haptic } from '@/lib/haptics';
import { clockLabel } from '@/lib/date';

const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_HEIGHT = 32;

/**
 * Günün akışı — statik: saatler sabit, yalnızca "şimdi" çizgisi gerçek
 * zamanı gösterir. Sürükleme ve görev yerleştirme sonraki adımda gelir.
 *
 * Varsayılan olarak kapalıdır: 16 saatlik ızgara ekranın yarısını kaplar ve
 * günün ilk sorusu "saat kaç?" değildir. Başlık satırı yine de şu anki saati
 * söyler; ızgara yalnızca istenirse açılır.
 *
 * Ekran okuyucu için dekoratif: 17 saat etiketi tek tek okunmaz.
 */
export function Timeline() {
  const { c, space, radius } = useTheme();
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const offset = ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const showNow = offset >= 0 && offset <= (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  return (
    <View style={{ marginTop: space.xl }}>
      <Pressable
        onPress={() => {
          haptic('tick');
          setOpen((value) => !value);
        }}
        accessible
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        accessibilityLabel={open ? 'Günün akışını kapat' : 'Günün akışını aç'}
        style={styles.header}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <AppText variant="meta" muted style={{ letterSpacing: 1.2 }}>
            GÜNÜN AKIŞI
          </AppText>
          <AppText variant="meta" faint>
            {clockLabel(now)}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AppText variant="meta" faint>
            {open ? 'Gizle' : 'Göster'}
          </AppText>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={c.textFaint}
          />
        </View>
      </Pressable>

      {open ? (
        <View
          style={{
            marginTop: space.sm,
            backgroundColor: c.surface,
            borderRadius: radius.card,
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        >
          <View style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT + 8 }}>
            {hours.map((hour, index) => (
              <View
                key={hour}
                style={[
                  styles.hourRow,
                  { height: HOUR_HEIGHT, borderTopColor: c.border },
                  index === 0 && styles.firstRow,
                ]}
              >
                <AppText variant="meta" faint style={styles.hourLabel}>
                  {String(hour).padStart(2, '0')}:00
                </AppText>
                <View style={[styles.rule, { backgroundColor: c.border }]} />
              </View>
            ))}

            {showNow ? (
              <View style={[styles.nowRow, { top: offset }]} pointerEvents="none">
                <View style={[styles.nowDot, { backgroundColor: c.accent }]} />
                <View style={[styles.nowLine, { backgroundColor: c.accent }]} />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    cursor: 'pointer',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    gap: 10,
  },
  firstRow: {
    borderTopWidth: 0,
  },
  hourLabel: {
    width: 44,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginTop: 7,
  },
  nowRow: {
    position: 'absolute',
    left: 52,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: -4,
  },
  nowLine: {
    flex: 1,
    height: 1.5,
  },
});
