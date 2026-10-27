import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { useMonthPlan } from './queries';
import { monthStartKey, localDayKey, dateFromDayKey, dayKeyLabel } from '@/lib/date';
import { radius } from '@/ui/tokens';

/**
 * Aylık takvim görünümü — 6 hafta grid.
 */
export function MonthView() {
  const { c, space } = useTheme();
  const [activeMonthStart, setActiveMonthStart] = useState(monthStartKey());
  const month = useMonthPlan(activeMonthStart);

  const prevMonth = () => {
    const d = dateFromDayKey(activeMonthStart);
    d.setMonth(d.getMonth() - 1);
    setActiveMonthStart(localDayKey(d));
  };
  const nextMonth = () => {
    const d = dateFromDayKey(activeMonthStart);
    d.setMonth(d.getMonth() + 1);
    setActiveMonthStart(localDayKey(d));
  };

  const today = localDayKey();
  const isCurrentMonth = activeMonthStart === monthStartKey();

  if (month.isPending) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Yükleniyor...</Text></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Ay navigasyonu */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, paddingVertical: space.sm }}>
        <Pressable onPress={prevMonth} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Önceki ay">
          <Ionicons name="chevron-back" size={28} color={c.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>
            {month.data ? dayKeyLabel(month.data.monthStart).replace(' ', ' ').toUpperCase() : 'Ay'}
          </Text>
          {isCurrentMonth && <Text style={{ fontSize: 10, fontWeight: '600', color: '#E8A33D', backgroundColor: '#E8A33D22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill }}>Bu Ay</Text>}
        </View>
        <Pressable onPress={nextMonth} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Sonraki ay">
          <Ionicons name="chevron-forward" size={28} color={c.text} />
        </Pressable>
      </View>

      {/* Hafta başlıkları */}
      <View style={{ flexDirection: 'row', paddingHorizontal: space.md, paddingVertical: space.xs, backgroundColor: '#16161A', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2A2A32' }}>
        {['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'].map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', letterSpacing: 0.3, color: '#8A847C' }}>{d}</Text>
        ))}
      </View>

      {/* 6 hafta grid */}
      <View style={{ flex: 1, paddingHorizontal: space.xs }}>
        {month.data?.weeks.map((week, wIndex) => (
          <View key={week.weekStart} style={{ flexDirection: 'row' }}>
            {week.days.map((day, dIndex) => {
              const isTodayCell = day.date === today;
              const isCurrentCell = dIndex === 0 && wIndex === 0 ? true : day.date.startsWith(activeMonthStart.slice(0, 7));
              const hasTasksCell = day.tasks.length > 0;
              const hasCompletedCell = day.completed.length > 0;

              return (
                <View
                  key={day.date}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: radius.md,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: isTodayCell ? c.accent : c.border,
                    backgroundColor: '#16161A',
                    padding: space.xs,
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 2,
                    opacity: !isCurrentCell ? 0.4 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isTodayCell ? '#E8A33D' : c.text }}>
                    {new Date(day.date).getDate()}
                  </Text>
                  {/* Energy dot */}
                  {day.energy !== null && (
                    <View style={{ flexDirection: 'row', gap: 1, marginTop: 1 }}>
                      {[1, 2, 3, 4, 5].map((l) => (
                        <View
                          key={l}
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: l <= (day.energy ?? 0) ? c.accent : c.border,
                          }}
                        />
                      ))}
                    </View>
                  )}
                  {/* Task indicators */}
                  <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                    {hasTasksCell && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#E8A33D' }} />}
                    {hasCompletedCell && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#7BE0AD' }} />}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
