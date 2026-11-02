import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { TextField } from '@/ui/components/TextField';
import { SkeletonLines } from '@/ui/components/Skeleton';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { dismissToRoot } from '@/lib/navigation';
import { localDayKey, timeLabel, todayLabel } from '@/lib/date';
import { useDayTasks } from '@/features/tasks/queries';
import type { Task } from '@/db/schema';
import { useCloseDay, useDayPlan } from '@/features/today/queries';

/**
 * Günü kapat — akşam ritüeli.
 *
 * Üç küçük karar: yarım kalanı yarına taşı ya da bırak; yarının üçünü seç;
 * günü tek cümleyle kapat. Hiçbir karar zorunlu değil: boş bırakılan görev
 * olduğu yerde kalır.
 */
export default function CloseDayScreen() {
  const { c, space, radius } = useTheme();
  const dayKey = localDayKey();
  const day = useDayTasks(dayKey);
  const plan = useDayPlan(dayKey);
  const close = useCloseDay(dayKey);

  const [carryIds, setCarryIds] = useState<string[]>([]);
  const [dropIds, setDropIds] = useState<string[]>([]);
  const [mustDoIds, setMustDoIds] = useState<string[]>([]);
  const [reflectionDraft, setReflectionDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openTasks = useMemo(
    () => [...(day.data?.mustDo ?? []), ...(day.data?.open ?? [])],
    [day.data],
  );
  const doneCount = day.data?.done.length ?? 0;
  const reflection = reflectionDraft ?? plan.data?.reflection ?? '';
  const closed = Boolean(plan.data?.closedAt);

  const toggle = (list: string[], setList: (next: string[]) => void, id: string) => {
    haptic('tick');
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  };

  const toggleCarry = (id: string) => {
    toggle(carryIds, setCarryIds, id);
    if (!carryIds.includes(id)) setDropIds(dropIds.filter((item) => item !== id));
  };

  const toggleDrop = (id: string) => {
    toggle(dropIds, setDropIds, id);
    if (!dropIds.includes(id)) {
      setCarryIds(carryIds.filter((item) => item !== id));
      setMustDoIds(mustDoIds.filter((item) => item !== id));
    }
  };

  const toggleMustDo = (id: string) => {
    if (!mustDoIds.includes(id) && mustDoIds.length >= 3) {
      toast('Yarının üçü dolu. Önce birini çıkar.', 'info');
      return;
    }
    toggle(mustDoIds, setMustDoIds, id);
    if (!mustDoIds.includes(id)) setDropIds(dropIds.filter((item) => item !== id));
  };

  const submit = () => {
    setError(null);
    close.mutate(
      {
        carryIds,
        dropIds,
        tomorrowMustDoIds: mustDoIds,
        reflection,
      },
      {
        onSuccess: () => {
          toast(closed ? 'Gün güncellendi' : 'Gün kapatıldı');
          dismissToRoot();
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Gün kapatılamadı.');
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader
        title="Günü kapat"
        subtitle={closed ? `Kapandı · ${timeLabel(plan.data?.closedAt)}` : todayLabel()}
      />

      {day.isPending ? (
        <View style={{ padding: space.lg }}>
          <SkeletonLines lines={5} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingTop: space.xs,
            paddingBottom: space.xxl,
            gap: space.md,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: c.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
              borderRadius: radius.card,
              padding: space.md,
              gap: space.lg,
            }}
          >
            <Stat value={String(doneCount)} label="tamamlandı" />
            <View style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: c.border }} />
            <Stat value={String(openTasks.length)} label="açık" />
            <View style={{ flex: 1 }} />
            {closed ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: space.xs,
                  paddingVertical: 4,
                  borderRadius: radius.pill,
                  backgroundColor: c.focusSoft,
                }}
              >
                <Ionicons name="checkmark-circle" size={14} color={c.focus} />
                <AppText variant="meta" style={{ color: c.focus, fontSize: 11 }}>
                  Kapandı
                </AppText>
              </View>
            ) : null}
          </View>

          <Section
            title="AÇIK KALANLAR"
            hint="Yarına taşı ya da bırak. Karar vermediğin görev bugünde kalır."
          >
            {openTasks.length === 0 ? (
              <AppText variant="body" muted>
                Açık görev yok. Gün zaten hafif.
              </AppText>
            ) : (
              openTasks.map((task, index) => (
                <DecisionRow
                  key={task.id}
                  task={task}
                  carry={carryIds.includes(task.id)}
                  drop={dropIds.includes(task.id)}
                  divider={index > 0}
                  onCarry={() => toggleCarry(task.id)}
                  onDrop={() => toggleDrop(task.id)}
                />
              ))
            )}
          </Section>

          <Section
            title={`YARININ ÜÇÜ · ${mustDoIds.length}/3`}
            hint="Yarın açtığında bu görevler en üstte olacak."
          >
            {openTasks.length === 0 ? (
              <AppText variant="body" muted>
                Seçilecek açık görev yok.
              </AppText>
            ) : (
              openTasks.map((task, index) => (
                <MustDoRow
                  key={task.id}
                  task={task}
                  selected={mustDoIds.includes(task.id)}
                  disabled={!mustDoIds.includes(task.id) && mustDoIds.length >= 3}
                  divider={index > 0}
                  onPress={() => toggleMustDo(task.id)}
                />
              ))
            )}
          </Section>

          <View style={{ gap: space.xs }}>
            <TextField
              label="BİR CÜMLE (OPSİYONEL)"
              value={reflection}
              onChangeText={setReflectionDraft}
              placeholder="Bugün nasıl geçti? Tek cümle yeter."
              multiline
              maxLength={280}
              accessibilityLabel="Günün değerlendirmesi"
            />
          </View>

          {error ? (
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
                {error}
              </AppText>
            </View>
          ) : null}

          <Button
            label={closed ? 'Günü güncelle' : 'Günü kapat'}
            icon={closed ? 'refresh-outline' : 'moon-outline'}
            onPress={submit}
            loading={close.isPending}
          />
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="title" style={{ color: c.text }}>
        {value}
      </AppText>
      <AppText variant="meta" faint>
        {label}
      </AppText>
    </View>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  const { c, space, radius } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ gap: 2 }}>
        <AppText variant="meta" muted style={{ letterSpacing: 1.1, fontWeight: '600' }}>
          {title}
        </AppText>
        <AppText variant="meta" faint>
          {hint}
        </AppText>
      </View>
      <View
        style={{
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          borderRadius: radius.card,
          padding: space.md,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function DecisionRow({
  task,
  carry,
  drop,
  divider,
  onCarry,
  onDrop,
}: {
  task: Task;
  carry: boolean;
  drop: boolean;
  divider: boolean;
  onCarry: () => void;
  onDrop: () => void;
}) {
  const { c, space } = useTheme();
  return (
    <View
      style={{
        paddingVertical: space.sm,
        gap: space.xs,
        borderTopWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderTopColor: c.border,
      }}
    >
      <AppText variant="bodyStrong" numberOfLines={2}>
        {task.title}
      </AppText>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        <Chip
          label="Yarına"
          accessibilityLabel={`${task.title}: yarına taşı`}
          selected={carry}
          role="checkbox"
          onPress={onCarry}
        />
        <Chip
          label="Bırak"
          accessibilityLabel={`${task.title}: bırak`}
          selected={drop}
          role="checkbox"
          onPress={onDrop}
        />
      </View>
    </View>
  );
}

function MustDoRow({
  task,
  selected,
  disabled,
  divider,
  onPress,
}: {
  task: Task;
  selected: boolean;
  disabled: boolean;
  divider: boolean;
  onPress: () => void;
}) {
  const { c, space } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole="checkbox"
      accessibilityLabel={`${task.title}: yarının üçüne ekle`}
      aria-checked={selected}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.sm,
        minHeight: 52,
        opacity: disabled ? 0.45 : 1,
        borderTopWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderTopColor: c.border,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: selected ? c.accent : c.borderStrong,
          backgroundColor: selected ? c.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Ionicons name="star" size={13} color={c.bg} /> : null}
      </View>
      <AppText variant="body" style={{ flex: 1 }} numberOfLines={2}>
        {task.title}
      </AppText>
    </Pressable>
  );
}
