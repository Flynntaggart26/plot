import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SubHeader } from '@/ui/components/SubHeader';
import { useTheme } from '@/ui/theme';
import { dateFromDayKey, weekStartKey } from '@/lib/date';
import { WeekView } from '@/features/plan/WeekView';
import { MonthView } from '@/features/plan/MonthView';

/**
 * Plan — haftalık ve aylık görünüm. Hafta ve ay aynı bağlamı paylaşır:
 * ayda bir güne dokunmak o haftayı hafta görünümünde açar.
 */
export default function PlanScreen() {
  const { c, space } = useTheme();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekAnchor, setWeekAnchor] = useState(weekStartKey());
  const [focusDay, setFocusDay] = useState<string | null>(null);

  const changeView = (next: 'week' | 'month') => {
    setView(next);
    if (next === 'month') setFocusDay(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader
        title="Plan"
        subtitle={view === 'week' ? 'Haftalık görev dağılımı' : 'Aylık takvim'}
      />

      <View style={[styles.segmentWrapper, { paddingHorizontal: space.lg }]}>
        <SegmentedControl
          value={view}
          onChange={(value) => changeView(value as 'week' | 'month')}
          segments={[
            { value: 'week', label: 'Hafta' },
            { value: 'month', label: 'Ay' },
          ]}
        />
      </View>

      <View style={{ flex: 1, paddingHorizontal: space.lg }}>
        {view === 'week' ? (
          <WeekView
            weekStart={weekAnchor}
            onWeekChange={(next) => {
              setWeekAnchor(next);
              setFocusDay(null);
            }}
            focusDay={focusDay}
          />
        ) : (
          <MonthView
            onOpenDay={(dayKey) => {
              setWeekAnchor(weekStartKey(dateFromDayKey(dayKey)));
              setFocusDay(dayKey);
              setView('week');
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentWrapper: {
    marginTop: 4,
    marginBottom: 8,
  },
});
