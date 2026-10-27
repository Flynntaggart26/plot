import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { haptic } from '@/lib/haptics';
import { radius, space as sp } from '@/ui/tokens';
import { dateFromDayKey, dayKeyLabel, localDayKey, monthStartKey } from '@/lib/date';
import type { DayPlan } from './service';
import { useMonthPlan } from './queries';

const WEEKDAYS = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];
const monthLabel = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });

/**
 * Aylık takvim — altı haftalık grid. Her hücre gerçek yükü gösterir
 * (planlanan + teslim tarihi o güne düşen görevler). Güne dokunmak
 * hafta görünümünü o güne açar; ay ekranı çıkmaz sokak değildir.
 */
export function MonthView({ onOpenDay }: { onOpenDay: (dayKey: string) => void }) {
  const { c, space } = useTheme();
  const [activeMonthStart, setActiveMonthStart] = useState(monthStartKey());
  const month = useMonthPlan(activeMonthStart);

  const shiftMonth = (delta: number) => {
    const date = dateFromDayKey(activeMonthStart);
    date.setMonth(date.getMonth() + delta);
    setActiveMonthStart(localDayKey(date));
    haptic('tick');
  };

  const today = localDayKey();
  const isCurrentMonth = activeMonthStart === monthStartKey();
  const monthKey = activeMonthStart.slice(0, 7);

  if (month.isPending) {
    return (
      <View style={styles.center}>
        <AppText variant="body" muted>
          Ay yükleniyor...
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.navBar}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="Önceki ay"
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>

        <View style={styles.navTitle}>
          <AppText variant="section" style={{ textTransform: 'capitalize' }}>
            {month.data ? monthLabel.format(dateFromDayKey(month.data.monthStart)) : 'Ay'}
          </AppText>
          {isCurrentMonth ? (
            <AppText
              variant="meta"
              style={[styles.badge, { color: c.accent, backgroundColor: c.accentSoft }]}
            >
              Bu ay
            </AppText>
          ) : null}
        </View>

        <Pressable
          onPress={() => shiftMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="Sonraki ay"
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={22} color={c.text} />
        </Pressable>
      </View>

      <View
        style={[
          styles.weekHeader,
          { backgroundColor: c.surfaceRaised, borderBottomColor: c.border },
        ]}
      >
        {WEEKDAYS.map((label) => (
          <AppText
            key={label}
            variant="meta"
            faint
            style={[styles.weekHeaderLabel, { fontSize: 10 }]}
          >
            {label}
          </AppText>
        ))}
      </View>

      <View style={[styles.grid, { paddingHorizontal: space.xs }]}>
        {month.data?.weeks.map((week) => (
          <View key={week.weekStart} style={styles.weekRow}>
            {week.days.map((day) => (
              <MonthCell
                key={day.date}
                day={day}
                inMonth={day.date.slice(0, 7) === monthKey}
                isToday={day.date === today}
                onOpenDay={onOpenDay}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function MonthCell({
  day,
  inMonth,
  isToday,
  onOpenDay,
}: {
  day: DayPlan;
  inMonth: boolean;
  isToday: boolean;
  onOpenDay: (dayKey: string) => void;
}) {
  const { c, radius: rad } = useTheme();
  const [hovered, setHovered] = useState(false);
  const pending = day.tasks.length;
  const completed = day.completed.length;

  return (
    <Pressable
      onPress={() => {
        haptic('light');
        onOpenDay(day.date);
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${dayKeyLabel(day.date)}${
        pending > 0 ? `, ${pending} açık görev` : ''
      }`}
      accessibilityHint="Hafta görünümünde aç"
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: rad.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isToday ? c.accent : hovered ? c.borderStrong : c.border,
        backgroundColor: hovered ? c.surfaceRaised : c.surface,
        paddingVertical: 4,
        paddingHorizontal: 2,
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 3,
        opacity: inMonth ? 1 : 0.4,
        cursor: 'pointer',
      }}
    >
      <AppText
        variant="meta"
        style={{
          fontSize: 12,
          lineHeight: 16,
          color: isToday ? c.accent : c.text,
        }}
      >
        {dateFromDayKey(day.date).getDate()}
      </AppText>

      {day.energy !== null ? (
        <View style={styles.energyRow}>
          {[1, 2, 3, 4, 5].map((level) => (
            <View
              key={level}
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: level <= (day.energy ?? 0) ? c.accent : c.border,
              }}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.dots}>
        {Array.from({ length: Math.min(pending, 3) }, (_, index) => (
          <View
            key={`p-${index}`}
            style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent }}
          />
        ))}
        {completed > 0 ? (
          <View
            style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.focus }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp.lg,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp.xs,
    gap: sp.xs,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  navTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.xs,
  },
  badge: {
    fontSize: 10,
    letterSpacing: 0.4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  weekHeader: {
    flexDirection: 'row',
    paddingVertical: sp.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekHeaderLabel: {
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  grid: {
    flex: 1,
    minHeight: 0,
    paddingTop: 2,
    paddingBottom: sp.xs,
    gap: 2,
  },
  weekRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 4,
  },
});
