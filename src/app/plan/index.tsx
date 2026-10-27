import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { Screen, ScreenIntro } from '@/ui/components/Screen';
import { WeekView } from '@/features/plan/WeekView';
import { MonthView } from '@/features/plan/MonthView';

/**
 * Plan — Haftalık ve aylık görünümlü planlama.
 * Drag-drop ile görevleri güne yerleştir.
 */
export default function PlanScreen() {
  const [view, setView] = useState<'week' | 'month'>('week');

  return (
    <Screen>
      <ScreenIntro
        title="Plan"
        subtitle={view === 'week' ? 'Haftalık görev dağılımı' : 'Aylık takvim'}
      />

      <View style={styles.segmentWrapper}>
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as 'week' | 'month')}
          segments={[
            { value: 'week', label: 'Hafta' },
            { value: 'month', label: 'Ay' },
          ]}
        />
      </View>

      {view === 'week' ? <WeekView /> : <MonthView />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segmentWrapper: {
    marginTop: -8,
    marginBottom: 8,
  },
});