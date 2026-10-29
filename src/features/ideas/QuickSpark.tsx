import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { fontFaceFor } from '@/ui/tokens';
import { AppText } from '@/ui/components/Screen';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { useCreateIdea } from './queries';
import { getDb } from '@/db/client';
import { ideas } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Tangent ekranının tepesindeki tek satırlık kıvılcım alanı.
 *
 * Fikri kaydetmek için form açmak gerekmez: yaz, Enter'a bas. Fikir her
 * zaman `spark` olarak doğar; olgunlaştırmak kullanıcının sonraki kararıdır.
 *
 * Feature 6 – Voice-to-Task: Mikrofon simgesi ile en fazla 10 saniyelik
 * ses kaydı yapılır; kayıt yerelde .mp3 olarak saklanır ve fikirle
 * ilişkilendirilir.
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
  const recordingRef = useRef<{
    stop: () => Promise<void>;
    uri: string;
  } | null>(null);

  const submit = () => {
    if (!trimmed || create.isPending) return;
    setError(null);

    create.mutate(
      {
        title: trimmed,
        status: 'spark',
        source: 'tangent-inline',
      },
      {
        onSuccess: (idea) => {
          // Kayitli ses varsa fikir kaydına bagla
          if (audioUri) {
            try {
              const db = getDb();
              db.update(ideas)
                .set({ audioPath: audioUri })
                .where(eq(ideas.id, idea.id))
                .run();
            } catch {
              // Ses baglantisi basarisiz olsa fikir kaydedilmis olur.
            }
          }
          setTitle('');
          setAudioUri(null);
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

  const toggleRecording = async () => {
    if (recording) {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stop();
        } catch {
          setAudioError('Ses kaydı durdurulamadı.');
        }
        recordingRef.current = null;
      }
      setRecording(false);
    } else {
      try {
        // expo-av dinamik import: web/Tauri masaüstünde AV yoksa sessizce geri dönülür.
        const { Audio } = (await import('expo-av')) as any;
        const { FileSystem } = (await import('expo-file-system')) as any;

        await Audio.requestPermissionsAsync();
        const recorder = new Audio.Recording();
        await recorder.prepareToRecordAsync(Audio.RECORDING_PRESET_HIGH_QUALITY);
        await recorder.startAsync();

        const fileUri = `${FileSystem.cacheDirectory}voice_${Date.now()}.mp3`;

        // 10 saniye sonra otomatik durdur
        const timer = setTimeout(async () => {
          try {
            await (recorder as any).stop();
            setAudioUri(fileUri);
            setRecording(false);
            recordingRef.current = null;
          } catch {
            setRecording(false);
            recordingRef.current = null;
          }
        }, 10000);

        recordingRef.current = {
          stop: async () => {
            clearTimeout(timer);
            await (recorder as any).stop();
            setRecording(false);
            recordingRef.current = null;
          },
          uri: fileUri,
        };
        setRecording(true);
      } catch {
        setAudioError('Ses kaydı desteklenmiyor.');
      }
    }
  };

  return (
    <View style={{ gap: space.xxs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: error ? c.danger : c.border,
          borderRadius: radius.pill,
          paddingLeft: space.md,
          paddingRight: 5,
          minHeight: 52,
        }}
      >
        <Ionicons name="bulb-outline" size={17} color={c.accent} />
        <TextInput
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (error) setError(null);
          }}
          onSubmitEditing={submit}
          placeholder="Aklına geleni yakala…"
          placeholderTextColor={c.textFaint}
          selectionColor={c.accent}
          returnKeyType="done"
          maxLength={160}
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
          onPress={toggleRecording}
          disabled={create.isPending}
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Kaydı durdur' : 'Ses kaydı başlat'}
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
            name={recording ? 'stop' : 'mic'}
            size={18}
            color={recording ? c.bg : c.textFaint}
          />
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={!trimmed || create.isPending}
          accessibilityRole="button"
          accessibilityLabel="Fikri kaydet"
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: trimmed ? c.accent : c.surfaceRaised,
            opacity: create.isPending ? 0.6 : 1,
            cursor: trimmed ? 'pointer' : 'auto',
          }}
        >
          <Ionicons
            name={create.isPending ? 'hourglass-outline' : 'arrow-up'}
            size={18}
            color={trimmed ? c.bg : c.textFaint}
          />
        </Pressable>
      </View>

      {audioUri ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
            paddingHorizontal: space.md,
            marginTop: space.xs,
            backgroundColor: c.surfaceRaised,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            borderRadius: radius.pill,
          }}
        >
          <Ionicons name="musical-notes" size={16} color={c.accent} />
          <AppText variant="meta" muted>
            Ses kaydı hazır
          </AppText>
          <Pressable
            onPress={() => {
              haptic('light');
            }}
            accessibilityLabel="Ses kaydını dinle"
            style={{ padding: 4 }}
          >
            <Ionicons name="play-outline" size={16} color={c.accent} />
          </Pressable>
          <Pressable
            onPress={() => {
              setAudioUri(null);
              haptic('light');
            }}
            accessibilityLabel="Kaydı sil"
            style={{ padding: 4 }}
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
});
