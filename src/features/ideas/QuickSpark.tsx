import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { fontFaceFor } from '@/ui/tokens';
import { AppText } from '@/ui/components/Screen';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { useCreateIdea } from './queries';

/**
 * Tangent ekranının tepesindeki tek satırlık kıvılcım alanı.
 *
 * Fikri kaydetmek için form açmak gerekmez: yaz, Enter'a bas. Fikir her
 * zaman `spark` olarak doğar; olgunlaştırmak kullanıcının sonraki kararıdır.
 */
export function QuickSpark() {
  const { c, space, radius, type } = useTheme();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = useCreateIdea();
  const trimmed = title.trim();

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
        onSuccess: () => {
          setTitle('');
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
