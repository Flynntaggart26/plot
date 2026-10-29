import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { useFocusStore } from '@/features/focus/store';
import { RingSVG } from '@/features/focus/RingSVG';
import { SessionDots } from '@/features/focus/SessionDots';
import { ModeToggle } from '@/features/focus/ModeToggle';
import { SettingsGrid } from '@/features/focus/SettingsGrid';
import { ColorPickers } from '@/features/focus/ColorPickers';
import { StartButton } from '@/features/focus/StartButton';
import { formatTime } from '@/features/focus/utils';
import { FOCUS_RING_CONSTANTS } from '@/features/focus/SegmentPath';
import { AppText } from '@/ui/components/Screen';

export default function FocusScreen() {
  const insets = useSafeAreaInsets();
  const { c, space } = useTheme();
  
  // Store selectors
  const mode = useFocusStore(s => s.mode);
  const timeLeft = useFocusStore(s => s.timeLeft);
  const duration = useFocusStore(s => s.duration);
  const totalSessions = useFocusStore(s => s.totalSessions);
  const completedWorkSessions = useFocusStore(s => s.completedWorkSessions);
  const innerProgress = useFocusStore(s => s.currentSessionProgress);
  const isRunning = useFocusStore(s => s.isRunning);
  const isCompleted = useFocusStore(s => s.timeLeft <= 0 && !s.isRunning);
  const innerColor = useFocusStore(s => s.innerColor);
  const outerColor = useFocusStore(s => s.outerColor);
  const breakInnerColor = useFocusStore(s => s.breakInnerColor);
  const breakOuterColor = useFocusStore(s => s.breakOuterColor);
  
  // Break reminder (Feature 9)
  const breakReminderEnabled = useFocusStore(s => s.breakReminderEnabled);
  const breakReminderTriggered = useFocusStore(s => s.breakReminderTriggered);
  const setBreakReminder = useFocusStore(s => s.setBreakReminder);
  const setBreakReminderTriggered = useFocusStore(s => s.setBreakReminderTriggered);

  // Actions
  const startTimer = useFocusStore(s => s.startTimer);
  const pauseTimer = useFocusStore(s => s.pauseTimer);
  const resetTimer = useFocusStore(s => s.resetTimer);
  const setMode = useFocusStore(s => s.setMode);

  // Derived state
  const isWork = mode === 'work';
  const outerSegmentsProgress = useMemo(() => {
    const base = Array(totalSessions).fill(0);
    if (isWork) {
      // Çalışma modunda: tamamlanmışlar 1, güncel progress, diğerleri 0
      for (let i = 0; i < completedWorkSessions; i++) base[i] = 1;
      if (isRunning && completedWorkSessions < totalSessions) {
        base[completedWorkSessions] = innerProgress;
      }
    } else {
      // Mola modunda: tamamlanmış çalışmalar 1, mola progress (güncel segment)
      for (let i = 0; i < completedWorkSessions; i++) base[i] = 1;
      if (isRunning && completedWorkSessions < totalSessions) {
        base[completedWorkSessions] = innerProgress;
      }
    }
    return base;
  }, [isWork, innerProgress, completedWorkSessions, totalSessions, isRunning]);

  // Haptic on completion
  useEffect(() => {
    if (timeLeft === 0 && !isRunning && duration > 0) {
      haptic('success');
    }
  }, [timeLeft, isRunning, duration]);

  // Break reminder toast (Feature 9)
  useEffect(() => {
    if (breakReminderTriggered) {
      toast('Ara? 2 dakika hareketsiz.');
      setBreakReminderTriggered(false);
    }
  }, [breakReminderTriggered, setBreakReminderTriggered]);

  // Handle timer completion
  const handleTimerPress = useCallback(() => {
    if (isCompleted) {
      if (mode === 'work') {
        // Çalışma bitti, mola başlasın (store içinde otomatik)
        // Sadece UI reset
        resetTimer();
      } else {
        // Mola bitti, çalışmaya devam
        resetTimer();
      }
    } else {
      haptic(isRunning ? 'light' : 'medium');
      if (isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    }
  }, [isCompleted, isRunning, mode, startTimer, pauseTimer, resetTimer]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.container, { paddingTop: insets.top + space.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>
            {isWork ? 'Odak' : 'Mola'}
          </Text>
        </View>

        {/* Ring Card */}
        <View style={styles.ringCard}>
          <View style={styles.ringWrap}>
            <RingSVG
              mode={mode}
              innerProgress={innerProgress}
              outerSegmentsProgress={outerSegmentsProgress}
              totalSessions={totalSessions}
              completedWorkSessions={completedWorkSessions}
              isRunning={isRunning}
              innerColor={innerColor}
              outerColor={outerColor}
              breakInnerColor={breakInnerColor}
              breakOuterColor={breakOuterColor}
            />
            <View style={styles.center}>
              <Text style={[styles.time, { color: isWork ? innerColor : breakInnerColor }]}>
                {formatTime(timeLeft)}
              </Text>
              <View style={styles.modeBadge}>
                <Text style={[styles.modeIcon, { color: isWork ? innerColor : breakInnerColor }]}>
                  {isWork ? '🔥' : '☕'}
                </Text>
                <Text style={[styles.modeText, { color: isWork ? innerColor : breakInnerColor }]}>
                  {isWork ? 'Çalışma' : 'Mola'}
                </Text>
              </View>
            </View>
          </View>

          {/* Session Dots */}
          <SessionDots
            totalSessions={totalSessions}
            completedWorkSessions={completedWorkSessions}
            isRunning={isRunning}
            mode={mode}
            outerColor={outerColor}
            breakOuterColor={breakOuterColor}
          />
          <Text style={[styles.sessionLabel, { color: c.textMuted }]}>
            {totalSessions} oturum
          </Text>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Mode Toggle */}
            <ModeToggle
              mode={mode}
              onChange={setMode}
              workColor={innerColor}
              breakColor={breakInnerColor}
            />

            <View style={styles.divider}>
              <Text style={styles.dividerText}>Ayarlar</Text>
            </View>

            <SettingsGrid />

            <View style={styles.divider}>
              <Text style={styles.dividerText}>Renkler</Text>
            </View>

            <ColorPickers />

            {/* Mola hatirlaticisi (Feature 9) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: space.xs,
              }}
            >
              <AppText variant="bodyStrong">Mola hatirlaticisi</AppText>
              <Switch
                value={breakReminderEnabled}
                onValueChange={(next) => {
                  haptic('tick');
                  setBreakReminder(next);
                }}
                trackColor={{ false: c.border, true: c.focus }}
              />
            </View>

            {/* Start Button */}
            <StartButton
              onPress={handleTimerPress}
              isRunning={isRunning}
              isCompleted={isCompleted}
              mode={mode}
              workColor={innerColor}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  ringCard: {
    marginHorizontal: 16,
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#2A2A30',
    borderRadius: 24,
    padding: 24,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  ringWrap: {
    position: 'relative',
    width: FOCUS_RING_CONSTANTS.SVG_SIZE,
    height: FOCUS_RING_CONSTANTS.SVG_SIZE,
    alignSelf: 'center',
    marginBottom: 16,
  },
  center: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  time: {
    fontSize: 64,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: 'SF Mono, Monaco, monospace',
    lineHeight: 64,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  modeIcon: {
    fontSize: 14,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sessionLabel: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
  },
  controls: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#8A847C',
  },
});