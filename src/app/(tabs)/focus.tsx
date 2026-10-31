import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { Screen, ScreenIntro, AppText } from '@/ui/components/Screen';
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

const MAX_RING = 300;

/**
 * Odak ekranı.
 *
 * Sıra tek bir soruya göre kurulur: "Şu an ne yapmalıyım?" Cevap büyük
 * halka ve hemen altındaki Başlat düğmesidir. Süre, oturum ve renkler
 * ikinci plandadır; kapalı bir "Ayarlar" bölümünde durur ki ilk bakışta
 * ekran bir kontrol paneline dönmesin.
 */
export default function FocusScreen() {
  const { c, space, radius } = useTheme();
  const { width } = useWindowDimensions();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const mode = useFocusStore((state) => state.mode);
  const timeLeft = useFocusStore((state) => state.timeLeft);
  const duration = useFocusStore((state) => state.duration);
  const totalSessions = useFocusStore((state) => state.totalSessions);
  const completedWorkSessions = useFocusStore((state) => state.completedWorkSessions);
  const innerProgress = useFocusStore((state) => state.currentSessionProgress);
  const isRunning = useFocusStore((state) => state.isRunning);
  const isCompleted = useFocusStore((state) => state.timeLeft <= 0 && !state.isRunning);
  const innerColor = useFocusStore((state) => state.innerColor);
  const outerColor = useFocusStore((state) => state.outerColor);
  const breakInnerColor = useFocusStore((state) => state.breakInnerColor);
  const breakOuterColor = useFocusStore((state) => state.breakOuterColor);

  const breakReminderEnabled = useFocusStore((state) => state.breakReminderEnabled);
  const breakReminderTriggered = useFocusStore((state) => state.breakReminderTriggered);
  const setBreakReminder = useFocusStore((state) => state.setBreakReminder);
  const setBreakReminderTriggered = useFocusStore((state) => state.setBreakReminderTriggered);

  const startTimer = useFocusStore((state) => state.startTimer);
  const pauseTimer = useFocusStore((state) => state.pauseTimer);
  const resetTimer = useFocusStore((state) => state.resetTimer);
  const setMode = useFocusStore((state) => state.setMode);

  const isWork = mode === 'work';

  const outerSegmentsProgress = useMemo(() => {
    const base = Array(totalSessions).fill(0);
    for (let index = 0; index < completedWorkSessions; index++) base[index] = 1;
    if (isRunning && completedWorkSessions < totalSessions) {
      base[completedWorkSessions] = innerProgress;
    }
    return base;
  }, [innerProgress, completedWorkSessions, totalSessions, isRunning]);

  // Oturum bitince kısa bir dokunsal onay; ekran metni zaten yeni moda döner.
  useEffect(() => {
    if (timeLeft === 0 && !isRunning && duration > 0) {
      haptic('success');
    }
  }, [timeLeft, isRunning, duration]);

  // 2 dakika hareketsizlik: nazik bir mola önerisi (Feature 9).
  useEffect(() => {
    if (breakReminderTriggered) {
      toast('Ara? 2 dakika hareketsiz.');
      setBreakReminderTriggered(false);
    }
  }, [breakReminderTriggered, setBreakReminderTriggered]);

  const handleTimerPress = useCallback(() => {
    if (isCompleted) {
      resetTimer();
      return;
    }
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isCompleted, isRunning, startTimer, pauseTimer, resetTimer]);

  const breakLabel = duration >= 15 * 60 ? 'Uzun mola' : 'Kısa mola';
  const subtitle = isWork
    ? isRunning
      ? `${completedWorkSessions + 1}. oturum sürüyor · ${Math.round(duration / 60)} dk`
      : completedWorkSessions >= totalSessions
        ? 'Tur tamamlandı. Uzun molayı hak ettin.'
        : 'Bir blok başlat; gerisini zamanlayıcı tutsun.'
    : `${breakLabel} · ${Math.round(duration / 60)} dk`;

  const ringSize = Math.max(200, Math.min(MAX_RING, width - space.lg * 4));
  const timerFont = Math.round(Math.min(64, ringSize * 0.21));

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <ScreenIntro
            eyebrow={isWork ? 'ODAK MODU' : 'MOLA MODU'}
            title={isWork ? 'Odak' : 'Mola'}
            subtitle={subtitle}
          />

          <View
            style={{
              marginTop: space.md,
              padding: space.lg,
              alignItems: 'center',
              backgroundColor: c.surface,
              borderRadius: radius.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
              overflow: 'hidden',
            }}
          >
            <View pointerEvents="none" style={[styles.edge, { backgroundColor: c.edge }]} />

            <View style={{ width: ringSize, height: ringSize }}>
              <RingSVG
                size={ringSize}
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

              <View style={styles.center} pointerEvents="none">
                <AppText
                  variant="timer"
                  style={{
                    color: c.text,
                    fontSize: timerFont,
                    lineHeight: timerFont,
                    letterSpacing: -1,
                  }}
                >
                  {formatTime(timeLeft)}
                </AppText>

                <View
                  style={[
                    styles.modeBadge,
                    {
                      backgroundColor: c.surfaceRaised,
                      borderColor: c.border,
                      borderRadius: radius.pill,
                      paddingHorizontal: space.sm,
                      marginTop: space.xxs,
                    },
                  ]}
                >
                  <Ionicons
                    name={isWork ? 'briefcase-outline' : 'cafe-outline'}
                    size={13}
                    color={c.textMuted}
                  />
                  <AppText variant="meta" style={{ color: c.textMuted, fontWeight: '600' }}>
                    {isWork ? 'Çalışma' : 'Mola'}
                  </AppText>
                </View>
              </View>
            </View>

            <View style={{ marginTop: space.md, gap: 6, alignItems: 'center' }}>
              <SessionDots
                totalSessions={totalSessions}
                completedWorkSessions={completedWorkSessions}
                isRunning={isRunning}
                mode={mode}
                outerColor={outerColor}
                breakOuterColor={breakOuterColor}
              />
              <AppText variant="meta" faint>
                {isWork
                  ? `${Math.min(completedWorkSessions + 1, totalSessions)} / ${totalSessions} oturum`
                  : `${completedWorkSessions} / ${totalSessions} oturum tamamlandı`}
              </AppText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: space.xs, marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <StartButton
                onPress={handleTimerPress}
                isRunning={isRunning}
                isCompleted={isCompleted}
                mode={mode}
                workColor={innerColor}
                breakColor={breakInnerColor}
              />
            </View>

            <Pressable
              onPress={() => {
                haptic('tick');
                resetTimer();
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Oturumu sıfırla"
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.surface,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: c.border,
                cursor: 'pointer',
              }}
            >
              <Ionicons name="refresh" size={20} color={c.textMuted} />
            </Pressable>
          </View>

          <View style={{ marginTop: space.sm }}>
            <ModeToggle
              mode={mode}
              onChange={setMode}
              workColor={innerColor}
              breakColor={breakInnerColor}
            />
          </View>

          <View
            style={{
              marginTop: space.md,
              backgroundColor: c.surface,
              borderRadius: radius.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
              overflow: 'hidden',
            }}
          >
            <Pressable
              onPress={() => {
                haptic('tick');
                setSettingsOpen((open) => !open);
              }}
              accessible
              accessibilityRole="button"
              accessibilityState={{ expanded: settingsOpen }}
              aria-expanded={settingsOpen}
              accessibilityLabel={settingsOpen ? 'Ayarları kapat' : 'Ayarları aç'}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                minHeight: 56,
                cursor: 'pointer',
              }}
            >
              <Ionicons name="options-outline" size={18} color={c.textMuted} />
              <View style={{ flex: 1, gap: 1 }}>
                <AppText variant="bodyStrong">Ayarlar</AppText>
                <AppText variant="meta" faint>
                  {totalSessions} oturum · süre, renkler, mola hatırlatıcısı
                </AppText>
              </View>
              <Ionicons
                name={settingsOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={c.textMuted}
              />
            </Pressable>

            {settingsOpen ? (
              <View
                style={{
                  gap: space.md,
                  paddingHorizontal: space.md,
                  paddingBottom: space.md,
                  paddingTop: space.sm,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: c.border,
                }}
              >
                <SettingsGrid />
                <ColorPickers />

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingTop: space.sm,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: c.border,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyStrong">Mola hatırlatıcısı</AppText>
                    <AppText variant="meta" faint>
                      2 dakika hareketsiz kalırsan nazikçe hatırlatır.
                    </AppText>
                  </View>
                  <Switch
                    value={breakReminderEnabled}
                    onValueChange={(next) => {
                      haptic('tick');
                      setBreakReminder(next);
                    }}
                    trackColor={{ false: c.border, true: c.focusSoft }}
                    thumbColor={breakReminderEnabled ? c.focus : c.textFaint}
                    ios_backgroundColor={c.border}
                    accessibilityLabel="Mola hatırlatıcısı"
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: StyleSheet.hairlineWidth * 2,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
