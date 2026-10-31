import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';
import { alpha } from '@/ui/color';
import { dateFromDayKey, weekStartKey } from '@/lib/date';
import { WeekView } from '@/features/plan/WeekView';
import { MonthView } from '@/features/plan/MonthView';
import { getWeekCapacity } from '@/features/plan/service';

function durationLabel(totalMin: number): string {
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours === 0) return `${minutes} dk`;
  if (minutes === 0) return `${hours} sa`;
  return `${hours} sa ${minutes} dk`;
}

/**
 * Plan — haftalık ve aylık görünüm. Hafta ve ay aynı bağlamı paylaşır:
 * ayda bir güne dokunmak o haftayı hafta görünümünde açar.
 */
export default function PlanScreen() {
  const { c, space, radius } = useTheme();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekAnchor, setWeekAnchor] = useState(weekStartKey());
  const [focusDay, setFocusDay] = useState<string | null>(null);

  // Haftalık kapasite uyarısı (Feature 5): >20 h -> "Hafta dolu"
  const capacity = getWeekCapacity(weekAnchor);

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

      {view === 'week' && capacity.overLimit ? (
        <View
          accessibilityRole="alert"
          style={{
            marginHorizontal: space.lg,
            marginTop: space.xs,
            marginBottom: space.xs,
            padding: space.md,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: space.sm,
            backgroundColor: alpha(c.warning, 0.1),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: alpha(c.warning, 0.4),
            borderRadius: radius.card,
          }}
        >
          <Ionicons name="alert-circle-outline" size={18} color={c.warning} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong">Hafta dolu</AppText>
            <AppText variant="meta" muted>
              {durationLabel(capacity.totalMin)} planlandı — 20 saatin üstünde. Bir işi başka
              haftaya taşımak bu haftayı kurtarabilir.
            </AppText>
          </View>
        </View>
      ) : null}

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
