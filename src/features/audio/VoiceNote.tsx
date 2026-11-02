import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { haptic } from '@/lib/haptics';
import { darken, lighten } from '@/ui/color';
import { formatClock, persistRecording, removeRecordingFile } from './recording';

/** Uzun kayıtlar veritabanını şişirmesin: tek seferde en fazla iki dakika. */
const MAX_DURATION_MS = 120_000;

const RECORD_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  // Geçici klasör sistem tarafından boşaltılabilir; kayıt belgede dursun.
  directory: 'document' as const,
};

/**
 * Sesli not eki.
 *
 * Kayıt ve oynatma aynı kartta durur; kullanıcı kaydı dinlemeden kaydetmek
 * zorunda kalmaz. Mikrofon izni reddedilirse sessizce yutmuyoruz: ne olduğunu
 * ve nereden açılacağını tek cümleyle söylüyoruz.
 */
export function VoiceNote({
  value,
  onChange,
  label = 'SESLİ NOT',
  hint = 'Konuşarak yakala. Kayıt yalnızca bu cihazda saklanır.',
}: {
  value: string | null;
  onChange: (path: string | null) => void;
  label?: string;
  hint?: string;
}) {
  const { c, space, radius } = useTheme();
  const recorder = useAudioRecorder(RECORD_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 200);
  const player = useAudioPlayer(value ?? null);
  const playerStatus = useAudioPlayerStatus(player);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discardNext = useRef(false);
  const wasRecording = useRef(false);
  const pulse = useSharedValue(0);

  const isRecording = recorderState.isRecording;
  const recordingMs = recorderState.durationMillis ?? 0;

  const finalize = useCallback(
    async (uri: string) => {
      setBusy(true);
      try {
        const stored = await persistRecording(uri);
        // Yeni kayıt eskisinin yerine geçiyorsa eski dosya ortada kalmasın.
        if (value && value !== stored) await removeRecordingFile(value);
        onChange(stored);
        haptic('success');
      } catch {
        await removeRecordingFile(uri);
        setError('Kayıt saklanamadı. Tekrar deneyin.');
      } finally {
        setBusy(false);
      }
    },
    [onChange, value],
  );

  /**
   * Kayıt iki yolla biter: kullanıcı bitirir ya da iki dakika dolar. İkisi de
   * `isRecording`ı false'a çevirir; kalıcılaştırma tek yerden yapılır.
   */
  useEffect(() => {
    const was = wasRecording.current;
    wasRecording.current = isRecording;
    if (!was || isRecording) return;

    const uri = recorder.uri;
    if (!uri) return;

    if (discardNext.current) {
      discardNext.current = false;
      void removeRecordingFile(uri);
      return;
    }

    void finalize(uri);
  }, [isRecording, recorder.uri, finalize]);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, false);
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
  }, [isRecording, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.4 }],
  }));

  const startRecording = async () => {
    setError(null);
    if (playerStatus.playing) player.pause();

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Mikrofon izni verilmedi. Sistem ya da tarayıcı ayarlarından izin ver.');
        return;
      }

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: MAX_DURATION_MS / 1000 });
      haptic('medium');
    } catch {
      setError('Kayıt başlatılamadı. Mikrofon başka bir uygulamada kullanılıyor olabilir.');
    }
  };

  const stopRecording = async (discard = false) => {
    if (!isRecording) return;
    discardNext.current = discard;
    haptic(discard ? 'light' : 'success');

    try {
      await recorder.stop();
    } catch {
      discardNext.current = false;
      setError('Kayıt bitirilemedi. Tekrar deneyin.');
    } finally {
      void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    }
  };

  const togglePlayback = () => {
    if (!value) return;

    if (playerStatus.playing) {
      player.pause();
      return;
    }

    const atEnd =
      Number.isFinite(playerStatus.duration) &&
      playerStatus.duration > 0 &&
      playerStatus.currentTime >= playerStatus.duration - 0.05;
    if (atEnd) void player.seekTo(0);
    player.play();
  };

  const remove = async () => {
    haptic('light');
    const previous = value;
    onChange(null);
    await removeRecordingFile(previous);
  };

  const durationLabel = (() => {
    if (playerStatus.playing) return formatClock(playerStatus.currentTime * 1000);
    if (Number.isFinite(playerStatus.duration) && playerStatus.duration > 0) {
      return formatClock(playerStatus.duration * 1000);
    }
    return 'Kayıt hazır';
  })();

  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="meta" muted style={{ letterSpacing: 0.6 }}>
        {label}
      </AppText>

      <View
        style={{
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isRecording ? c.danger : c.border,
          borderRadius: radius.md,
          padding: space.sm,
        }}
      >
        {isRecording ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={styles.micSlot}>
              <Animated.View
                style={[
                  styles.pulse,
                  { backgroundColor: c.danger, borderColor: c.surface },
                  pulseStyle,
                ]}
              />
              <View style={[styles.dot, { backgroundColor: c.danger }]} />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <AppText
                variant="bodyStrong"
                accessibilityLiveRegion="polite"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatClock(recordingMs)}
              </AppText>
              <AppText variant="meta" faint>
                Kaydediliyor · en fazla 2 dakika
              </AppText>
            </View>

            <Pressable
              onPress={() => void stopRecording(true)}
              accessibilityRole="button"
              accessibilityLabel="Kaydı iptal et"
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="close" size={18} color={c.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => void stopRecording(false)}
              accessibilityRole="button"
              accessibilityLabel="Kaydı bitir"
              style={({ pressed }) => ({
                minHeight: 40,
                paddingHorizontal: space.md,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.danger,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <AppText variant="bodyStrong" style={{ color: c.bg }}>
                Bitir
              </AppText>
            </Pressable>
          </View>
        ) : value ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Pressable
              onPress={togglePlayback}
              accessibilityRole="button"
              accessibilityLabel={playerStatus.playing ? 'Kaydı duraklat' : 'Kaydı oynat'}
              hitSlop={4}
              style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            >
              <LinearGradient
                colors={[lighten(c.accent, 0.14), c.accent, darken(c.accent, 0.12)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.playCircle}
              >
                <Ionicons
                  name={playerStatus.playing ? 'pause' : 'play'}
                  size={18}
                  color={c.bg}
                  style={playerStatus.playing ? undefined : { marginLeft: 2 }}
                />
              </LinearGradient>
            </Pressable>

            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong">Ses kaydı</AppText>
              <AppText variant="meta" faint style={{ fontVariant: ['tabular-nums'] }}>
                {durationLabel}
              </AppText>
            </View>

            <Pressable
              onPress={() => void remove()}
              accessibilityRole="button"
              accessibilityLabel="Kaydı kaldır"
              hitSlop={8}
              style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="trash-outline" size={18} color={c.danger} />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Pressable
              onPress={() => void startRecording()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Ses kaydı başlat"
              hitSlop={4}
              style={({ pressed }) => ({ opacity: busy ? 0.55 : pressed ? 0.75 : 1 })}
            >
              <LinearGradient
                colors={[lighten(c.accent, 0.14), c.accent, darken(c.accent, 0.12)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.playCircle}
              >
                {busy ? (
                  <Ionicons name="hourglass-outline" size={18} color={c.bg} />
                ) : (
                  <Ionicons name="mic" size={19} color={c.bg} />
                )}
              </LinearGradient>
            </Pressable>

            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong">Ses kaydı ekle</AppText>
              <AppText variant="meta" faint>
                Tek dokunuşla kaydet, dinle, sonra karar ver.
              </AppText>
            </View>
          </View>
        )}
      </View>

      {error ? (
        <AppText variant="meta" style={{ color: c.danger }} accessibilityRole="alert">
          {error}
        </AppText>
      ) : (
        <AppText variant="meta" faint>
          {hint}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  micSlot: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
