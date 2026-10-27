import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SubHeader } from '@/ui/components/SubHeader';
import { useTheme } from '@/ui/theme';
import { WeekView } from '@/features/plan/WeekView';
import { MonthView } from '@/features/plan/MonthView';

/**
 * Plan — Haftalık ve aylık görünümlü planlama.
 * Drag-drop ile görevleri güne yerleştir.
 */
export default function PlanScreen() {
  const { c, space } = useTheme();
  const [view, setView] = useState<'week' | 'month'>('week');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader
        title="Plan"
        subtitle={view === 'week' ? 'Haftalık görev dağılımı' : 'Aylık takvim'}
      />

      <View style={[styles.segmentWrapper, { paddingHorizontal: space.lg }]}>
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as 'week' | 'month')}
          segments={[
            { value: 'week', label: 'Hafta' },
            { value: 'month', label: 'Ay' },
          ]}
        />
      </View>

      <View style={{ flex: 1, paddingHorizontal: space.lg }}>
        {view === 'week' ? <WeekView /> : <MonthView />}
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