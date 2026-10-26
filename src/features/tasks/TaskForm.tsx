import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { Chip } from '@/ui/components/Chip';
import { TextField } from '@/ui/components/TextField';
import { Button } from '@/ui/components/Button';
import { usePressScale } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';
import type { Task } from '@/db/schema';
import { MUST_DO_LIMIT, type TaskEnergy } from './service';

export type TaskFormValues = {
  title: string;
  notes: string;
  estimateMin: number | null;
  energy: TaskEnergy | null;
  mustDo: boolean;
};

const ESTIMATES: { value: number | null; label: string }[] = [
  { value: null, label: 'Yok' },
  { value: 5, label: '5 dk' },
  { value: 15, label: '15 dk' },
  { value: 25, label: '25 dk' },
  { value: 45, label: '45 dk' },
  { value: 90, label: '90 dk' },
];

const ENERGY_OPTIONS: { value: TaskEnergy; label: string }[] = [
  { value: 'low', label: 'Düşük' },
  { value: 'mid', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
];

/** Aynı form hem yeni görev hem düzenleme için kullanılır. */
export function TaskForm({
  initial,
  defaultMustDo = false,
  openMustDoCount,
  submitLabel,
  onSubmit,
  busy = false,
  error,
  footer,
}: {
  initial?: Task;
  defaultMustDo?: boolean;
  openMustDoCount: number;
  submitLabel: string;
  onSubmit: (values: TaskFormValues) => void;
  busy?: boolean;
  error?: string | null;
  footer?: React.ReactNode;
}) {
  const { space, c, radius } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [estimateMin, setEstimateMin] = useState<number | null>(initial?.estimateMin ?? null);
  const [energy, setEnergy] = useState<TaskEnergy | null>(initial?.energy ?? null);
  const [mustDo, setMustDo] = useState(
    initial ? initial.priority === 1 : defaultMustDo && openMustDoCount < MUST_DO_LIMIT,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const startingMustDo = initial ? initial.priority === 1 : false;
  const mustDoFull = openMustDoCount >= MUST_DO_LIMIT && !startingMustDo;
  /**
   * Gün verisi yüklenirken sayaç 0 görünür. Form `mustDo` ile açılıp veri
   * gelince sınır doluysa seçim ekranda ve kayıtta düşer; kullanıcıya
   * "işaretli ama devre dışı" bir kutu göstermeyiz.
   */
  const shownMustDo = mustDo && !mustDoFull;
  const shownError = localError ?? error ?? null;

  const submit = () => {
    if (!title.trim()) {
      setLocalError('Görev başlığı boş olamaz.');
      return;
    }
    setLocalError(null);
    onSubmit({ title, notes, estimateMin, energy, mustDo: shownMustDo });
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
          label="NE YAPILACAK"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (localError) setLocalError(null);
          }}
          placeholder="Tek satırda, yapılabilir bir şey"
          autoFocus={!initial}
          maxLength={160}
          returnKeyType="next"
          error={!title.trim() && localError ? localError : null}
          accessibilityLabel="Görev başlığı"
        />

        <TextField
          label="NOT (OPSİYONEL)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Bağlam, ilk adım, unutmaman gereken ayrıntı"
          multiline
          maxLength={2000}
          accessibilityLabel="Görev notu"
        />

        <View style={{ gap: space.xs }}>
          <AppText variant="meta" muted style={{ letterSpacing: 0.6 }}>
            TAHMİN
          </AppText>
          <View style={styles.wrap}>
            {ESTIMATES.map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                selected={estimateMin === option.value}
                role="radio"
                onPress={() => setEstimateMin(option.value)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: space.xs }}>
          <AppText variant="meta" muted style={{ letterSpacing: 0.6 }}>
            GEREKEN ENERJİ
          </AppText>
          <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Gereken enerji">
            {ENERGY_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={energy === option.value}
                role="radio"
                onPress={() => setEnergy(energy === option.value ? null : option.value)}
              />
            ))}
          </View>
        </View>

        <MustDoToggle
          value={shownMustDo}
          disabled={mustDoFull}
          count={openMustDoCount}
          onChange={(next) => {
            haptic('tick');
            setMustDo(next);
          }}
        />

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

function MustDoToggle({
  value,
  disabled,
  count,
  onChange,
}: {
  value: boolean;
  disabled: boolean;
  count: number;
  onChange: (next: boolean) => void;
}) {
  const { c, space, radius } = useTheme();
  const { style, handlers } = usePressScale(disabled);

  return (
    <Animated.View style={style}>
      <Pressable
        {...handlers}
        onPress={() => {
          if (!disabled) onChange(!value);
        }}
        disabled={disabled}
        accessible
        accessibilityRole="checkbox"
        accessibilityLabel="Must-do olarak işaretle"
        aria-checked={value}
        aria-disabled={disabled}
        style={{
          backgroundColor: c.surface,
          borderColor: value ? c.accent : c.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.md,
          padding: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: value ? c.accent : c.borderStrong,
              backgroundColor: value ? c.accent : 'transparent',
            },
          ]}
        >
          {value ? <Ionicons name="star" size={14} color={c.bg} /> : null}
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">Must-do</AppText>
          <AppText variant="meta" muted>
            {disabled
              ? `Bugünün üçü dolu (${count}/${MUST_DO_LIMIT}). Birini tamamlayınca yer açılır.`
              : `Bugünün üç şeyinden biri (${count}/${MUST_DO_LIMIT})`}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
