import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import { useTheme } from '@/ui/theme';
import { fontFaceFor } from '@/ui/tokens';
import { AppText } from '@/ui/components/Screen';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { useCreateIdea } from './queries';
import { getDb } from '@/db/client';
import { ideas } from '@/db/schema';
import { eq } from 'drizzle-orm';

/** Kayıt üst sınırı. Kısa tutulur: buradaki ses bir not değil, bir hatırlatıcı. */
const MAX_RECORD_MS = 10_000;

/**
 * Kayıt, uygulamanın belge dizinine yazılır. Önbellek dizini sistem baskı
 * altında silinebilir; kullanıcı fikrini haftalar sonra açtığında sesin
 * yerinde olması gerekir.
 */
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  directory: 'document' as const,
};

/**
 * Tangent ekranının tepesindeki tek satırlık kıvılcım alanı.
 *
 * Fikri kaydetmek için form açmak gerekmez: yaz, Enter'a bas. Fikir her
 * zaman `spark` olarak doğar; olgunlaştırmak kullanıcının sonraki kararıdır.
 *
 * Voice-to-Task: mikrofon en fazla 10 saniye kaydeder. Kayıt bitince
 * dosyanın gerçek yolu (`recorder.uri`) fikre bağlanır; oynatma aynı
 * dosyadan yapılır, böylece kaydettiğini duymadan kaydetmiş olmazsın.
 */
export function QuickSpark() {
  const { c, space, radius, type } = useTheme();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const create = useCreateIdea();
  const trimmed = title.trim();

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const player = useAudioPlayer(audioUri);
  const playback = useAudioPlayerStatus(player);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ekrandan çıkarken zamanlayıcı ve oynatıcı arkada kalmasın.
  useEffect(() => {
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
    };
  }, []);

  const resetAudio = () => {
    if (playback.playing) player.pause();
    setAudioUri(null);
    setAudioError(null);
  };

  const finishRecording = async () => {
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    setRecording(false);

    try {
      await recorder.stop();
    } catch {
      // Durdurma hatası kaydı geçersiz kılmaz; dosya yine de yazılmış olabilir.
    }

    const uri = recorder.uri;
    if (uri) {
      setAudioUri(uri);
      haptic('success');
    } else {
      setAudioError('Kayıt alınamadı. Mikrofon iznini kontrol et.');
      haptic('light');
    }
  };

  const startRecording = async () => {
    setAudioError(null);
    setError(null);

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setAudioError('Mikrofon izni verilmedi.');
        return;
      }

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      resetAudio();
      setRecording(true);
      haptic('medium');
      stopTimer.current = setTimeout(() => {
        void finishRecording();
      }, MAX_RECORD_MS);
    } catch {
      setRecording(false);
      setAudioError('Ses kaydı başlatılamadı. Bu cihazda mikrofon kullanılamıyor olabilir.');
    }
  };

  const togglePlayback = async () => {
    if (!audioUri) return;

    try {
      if (playback.playing) {
        player.pause();
        return;
      }

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      // Bitmiş bir kaydı tekrar dinlemek için başa sar; yoksa sessiz kalır.
      if (playback.didJustFinish || playback.currentTime > 0) {
        await player.seekTo(0);
      }
      player.play();
      haptic('light');
    } catch {
      setAudioError('Kayıt oynatılamadı.');
    }
  };

  const submit = () => {
    if (!trimmed || create.isPending || recording) return;
    setError(null);

    create.mutate(
      {
        title: trimmed,
        status: 'spark',
        source: 'tangent-inline',
      },
      {
        onSuccess: (idea) => {
          // Kayıtlı ses varsa fikir kaydına bağla.
          if (audioUri) {
            try {
              const db = getDb();
              db.update(ideas)
                .set({ audioPath: audioUri })
                .where(eq(ideas.id, idea.id))
                .run();
            } catch {
              // Ses bağlantısı başarısız olsa fikir kaydedilmiş olur.
            }
          }
          setTitle('');
          resetAudio();
          haptic('success');
          toast('Kıvılcım yakalandı');
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Fikir kaydedilemedi.');
          haptic('light');
        },
      },
    );
  };

  const canSubmit = trimmed.length > 0 && !create.isPending && !recording;

  return (
    <View style={{ gap: space.xxs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: error ? c.danger : recording ? c.danger : c.border,
          borderRadius: radius.pill,
          paddingLeft: space.md,
          paddingRight: 5,
          minHeight: 52,
        }}
      >
        <Ionicons
          name={recording ? 'mic' : 'bulb-outline'}
          size={17}
          color={recording ? c.danger : c.accent}
        />
        <TextInput
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (error) setError(null);
          }}
          onSubmitEditing={submit}
          placeholder={recording ? 'Kayıt sürüyor…' : 'Aklına geleni yakala…'}
          placeholderTextColor={c.textFaint}
          selectionColor={c.accent}
          returnKeyType="done"
          maxLength={160}
          editable={!recording}
          accessibilityLabel="Hızlı fikir"
          style={[
            styles.input,
            {
              fontFamily: fontFaceFor(type.body),
              fontSize: type.body.size,
              color: c.text,
            },
          ]}
        />

        <Pressable
          onPress={() => {
            if (recording) void finishRecording();
            else void startRecording();
          }}
          disabled={create.isPending}
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Kaydı durdur' : 'Ses kaydı başlat'}
          accessibilityState={{ busy: recording }}
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: recording ? c.danger : c.surfaceRaised,
            opacity: create.isPending ? 0.6 : 1,
            cursor: 'pointer',
          }}
        >
          <Ionicons
            name={recording ? 'stop' : 'mic-outline'}
            size={18}
            color={recording ? '#FFFFFF' : c.textMuted}
          />
        </Pressable>

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Fikri kaydet"
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canSubmit ? c.accent : c.surfaceRaised,
            opacity: create.isPending ? 0.6 : 1,
            cursor: canSubmit ? 'pointer' : 'auto',
          }}
        >
          <Ionicons
            name={create.isPending ? 'hourglass-outline' : 'arrow-up'}
            size={18}
            color={canSubmit ? c.bg : c.textFaint}
          />
        </Pressable>
      </View>

      {recording ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md }}
          accessibilityRole="alert"
        >
          <View style={[styles.liveDot, { backgroundColor: c.danger }]} />
          <AppText variant="meta" style={{ color: c.danger }}>
            Kaydediliyor · en fazla 10 sn
          </AppText>
        </View>
      ) : null}

      {audioUri && !recording ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
            paddingLeft: space.md,
            paddingRight: space.xxs,
            marginTop: space.xxs,
            backgroundColor: c.surfaceRaised,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            borderRadius: radius.pill,
            minHeight: 40,
          }}
        >
          <Ionicons name="musical-notes-outline" size={16} color={c.accent} />
          <AppText variant="meta" muted style={{ flex: 1 }} numberOfLines={1}>
            {playback.playing ? 'Dinleniyor…' : 'Ses kaydı hazır'}
          </AppText>
          <Pressable
            onPress={() => void togglePlayback()}
            accessibilityRole="button"
            accessibilityLabel={playback.playing ? 'Kaydı duraklat' : 'Ses kaydını dinle'}
            style={styles.iconButton}
          >
            <Ionicons
              name={playback.playing ? 'pause' : 'play'}
              size={16}
              color={c.accent}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              resetAudio();
              haptic('light');
            }}
            accessibilityRole="button"
            accessibilityLabel="Kaydı sil"
            style={styles.iconButton}
          >
            <Ionicons name="trash-outline" size={16} color={c.danger} />
          </Pressable>
        </View>
      ) : null}

      {audioError ? (
        <View style={{ paddingHorizontal: space.md }} accessibilityRole="alert">
          <AppText variant="meta" style={{ color: c.danger }}>
            {audioError}
          </AppText>
        </View>
      ) : null}

      {error ? (
        <View style={{ paddingHorizontal: space.md }} accessibilityRole="alert">
          <AppText variant="meta" style={{ color: c.danger }}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as unknown as 'solid' } : null),
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
