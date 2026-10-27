import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { Chip } from '@/ui/components/Chip';
import { TextField } from '@/ui/components/TextField';
import { Button } from '@/ui/components/Button';
import type { Idea } from '@/db/schema';
import { IDEA_STATUS_LABELS, type IdeaStatus } from './service';

export type IdeaFormValues = {
  title: string;
  body: string;
  firstStep: string;
  status: IdeaStatus;
};

const STATUS_OPTIONS: { value: IdeaStatus; label: string }[] = (
  ['spark', 'saved', 'committed', 'archived'] as const
).map((value) => ({ value, label: IDEA_STATUS_LABELS[value] }));

/**
 * Fikir formu: yakalama ve düzenleme aynı alanları kullanır.
 * Yeni fikirde durum seçimi gizlidir; kıvılcım olarak doğar.
 */
export function IdeaForm({
  initial,
  showStatus = false,
  submitLabel,
  onSubmit,
  busy = false,
  error,
  footer,
}: {
  initial?: Idea;
  showStatus?: boolean;
  submitLabel: string;
  onSubmit: (values: IdeaFormValues) => void;
  busy?: boolean;
  error?: string | null;
  footer?: React.ReactNode;
}) {
  const { space, c, radius } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [firstStep, setFirstStep] = useState(initial?.firstStep ?? '');
  const [status, setStatus] = useState<IdeaStatus>((initial?.status as IdeaStatus) ?? 'spark');
  const [localError, setLocalError] = useState<string | null>(null);

  const shownError = localError ?? error ?? null;

  const submit = () => {
    if (!title.trim()) {
      setLocalError('Fikir başlığı boş olamaz.');
      return;
    }
    setLocalError(null);
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      firstStep: firstStep.trim(),
      status,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.xxl,
          gap: space.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="FİKİR"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (localError) setLocalError(null);
          }}
          placeholder="Aklına geleni tek satırda yakala"
          autoFocus={!initial}
          maxLength={160}
          returnKeyType="next"
          error={!title.trim() && localError ? localError : null}
          accessibilityLabel="Fikir başlığı"
        />

        <TextField
          label="DETAY (OPSİYONEL)"
          value={body}
          onChangeText={setBody}
          placeholder="Neden ilginç? Neyi değiştirebilir?"
          multiline
          maxLength={4000}
          accessibilityLabel="Fikir detayı"
        />

        <TextField
          label="İLK ADIM (OPSİYONEL)"
          value={firstStep}
          onChangeText={setFirstStep}
          placeholder="5 dakikada yapılabilecek tek bir şey"
          maxLength={200}
          hint="Fikri başlatmak için gereken en küçük eylem."
          accessibilityLabel="Fikrin ilk adımı"
        />

        {showStatus ? (
          <View style={{ gap: space.xs }}>
            <AppText variant="meta" muted style={{ letterSpacing: 0.6 }}>
              DURUM
            </AppText>
            <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Fikir durumu">
              {STATUS_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={status === option.value}
                  role="radio"
                  onPress={() => setStatus(option.value)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {shownError ? (
          <View
            style={{
              backgroundColor: c.surface,
              borderColor: c.danger,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: radius.md,
              padding: space.md,
            }}
            accessibilityRole="alert"
          >
            <AppText variant="meta" style={{ color: c.danger }}>
              {shownError}
            </AppText>
          </View>
        ) : null}

        <Button label={submitLabel} onPress={submit} loading={busy} disabled={!title.trim()} />

        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
