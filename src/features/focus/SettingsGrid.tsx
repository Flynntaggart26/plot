import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { Select } from '@/ui/components/Select';
import { useFocusStore } from './store';

const DURATION_OPTIONS = Array.from({ length: 120 }, (_, index) => {
  const minutes = index + 1;
  return { value: minutes, label: `${minutes} dk` };
});

const SESSION_OPTIONS = [2, 3, 4, 5, 6, 8].map((count) => ({
  value: count,
  label: `${count} oturum`,
}));

/**
 * Süre ve oturum sayısı. İkisi de çalışırken kilitlidir: bir bloğun
 * ortasında süreyi değiştirmek sayacı sıfırlar ve güveni sarsar.
 */
export function SettingsGrid() {
  const { space } = useTheme();
  const duration = useFocusStore((state) => state.duration);
  const totalSessions = useFocusStore((state) => state.totalSessions);
  const isRunning = useFocusStore((state) => state.isRunning);
  const mode = useFocusStore((state) => state.mode);
  const setDuration = useFocusStore((state) => state.setDuration);
  const setTotalSessions = useFocusStore((state) => state.setTotalSessions);

  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <View style={{ flex: 1, gap: 6 }}>
        <AppText variant="meta" muted>
          Süre
        </AppText>
        <Select
          value={duration / 60}
          options={DURATION_OPTIONS}
          onChange={(value) => setDuration(parseInt(value, 10))}
          disabled={isRunning || mode !== 'work'}
          accessibilityLabel="Çalışma süresi"
        />
      </View>

      <View style={{ flex: 1, gap: 6 }}>
        <AppText variant="meta" muted>
          Oturum
        </AppText>
        <Select
          value={totalSessions}
          options={SESSION_OPTIONS}
          onChange={(value) => setTotalSessions(parseInt(value, 10))}
          disabled={isRunning}
          accessibilityLabel="Oturum sayısı"
        />
      </View>
    </View>
  );
}
