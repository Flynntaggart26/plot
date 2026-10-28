import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SelectWrap } from '@/ui/components/SelectWrap';
import { useFocusStore } from './store';
import { useTheme } from '@/ui/theme';

const DURATION_OPTIONS = Array.from({ length: 120 }, (_, i) => i + 1).map(n => ({ value: n, label: `${n} dk` }));
const SESSION_OPTIONS = [2, 3, 4, 5, 6, 8].map(n => ({ value: n, label: `${n} oturum` }));

export function SettingsGrid() {
  const { c } = useTheme();
  const duration = useFocusStore(s => s.duration);
  const totalSessions = useFocusStore(s => s.totalSessions);
  const isRunning = useFocusStore(s => s.isRunning);
  const mode = useFocusStore(s => s.mode);
  const setDuration = useFocusStore(s => s.setDuration);
  const setTotalSessions = useFocusStore(s => s.setTotalSessions);

  const durationMinutes = duration / 60;

  return (
    <View style={styles.grid}>
      {/* Süre */}
      <View style={styles.item}>
        <Text style={[styles.label, { color: c.textFaint }]}>Süre</Text>
        <SelectWrap
          value={durationMinutes}
          options={DURATION_OPTIONS}
          onChange={val => setDuration(parseInt(val, 10))}
          disabled={isRunning || mode !== 'work'}
          accessibilityLabel="Çalışma süresi dakika"
        />
      </View>

      {/* Oturum */}
      <View style={styles.item}>
        <Text style={[styles.label, { color: c.textFaint }]}>Oturum</Text>
        <SelectWrap
          value={totalSessions}
          options={SESSION_OPTIONS}
          onChange={val => setTotalSessions(parseInt(val, 10))}
          disabled={isRunning}
          accessibilityLabel="Oturum sayısı"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  item: {
    flex: 1,
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});