import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, ScreenIntro, AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { greetingLabel, localDayKey, todayLabel } from '@/lib/date';
import { useDayTasks, useToggleTask } from '@/features/tasks/queries';
import { MUST_DO_LIMIT, type DayTasks } from '@/features/tasks/service';
import { TaskRow } from '@/features/tasks/TaskRow';
import { EnergyRow } from '@/features/today/EnergyRow';
import { Timeline } from '@/features/today/Timeline';
import { useDayEnergy, useSetDayEnergy } from '@/features/today/queries';
import { glow } from '@/ui/tokens';

/**
 * Today — günün tek bakışta görünen hâli.
 *
 * Sıra bilinçli: önce enerji, sonra must-do, sonra diğer görevler, en sonda
 * zaman çizelgesi. Uzun ve dekoratif olan, eylemin arkasında durur.
 */
export default function TodayScreen() {
  const { c, space } = useTheme();
  const router = useRouter();

  const dayKey = useMemo(() => localDayKey(), []);
  const greeting = useMemo(() => greetingLabel(), []);
  const dateLabel = useMemo(() => todayLabel(), []);

  const tasksQuery = useDayTasks(dayKey);
  const energyQuery = useDayEnergy(dayKey);
  const setEnergy = useSetDayEnergy(dayKey);
  const toggle = useToggleTask();

  const data = tasksQuery.data;
  const openCount = (data?.mustDo.length ?? 0) + (data?.open.length ?? 0);
  const doneCount = data?.done.length ?? 0;

  const subtitle = !data
    ? undefined
    : openCount === 0 && doneCount === 0
      ? 'Bugün için üç şey yeter.'
      : `${openCount} açık · ${doneCount} tamamlandı`;

  const onToggle = (id: string, done: boolean) => toggle.mutate({ id, done });
  const isPending = (id: string) => toggle.isPending && toggle.variables?.id === id;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenIntro eyebrow={dateLabel} title={greeting} subtitle={subtitle} />

        <EnergyRow
          value={energyQuery.data ?? null}
          onChange={(level) => setEnergy.mutate(level)}
          disabled={setEnergy.isPending}
        />

        {tasksQuery.isError ? (
          <ErrorBanner
            message="Görevler okunamadı."
            actionLabel="Tekrar dene"
            onAction={() => void tasksQuery.refetch()}
          />
        ) : null}

        {toggle.isError ? <ErrorBanner message="Görev güncellenemedi, geri alındı." /> : null}

        <SectionCard
          label="MUST-DO"
          count={data ? `${data.mustDo.length} / ${MUST_DO_LIMIT}` : '—'}
          glowing={Boolean(data && data.mustDo.length > 0)}
          action={
            data && data.mustDo.length < MUST_DO_LIMIT ? (
              <Pressable
                onPress={() => {
                  haptic('tick');
                  router.push({ pathname: '/task/new', params: { mustDo: '1' } });
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Must-do ekle"
                style={styles.cardAction}
              >
                <Ionicons name="add" size={20} color={c.accent} />
              </Pressable>
            ) : undefined
          }
        >
          {tasksQuery.isPending ? (
            <LoadingRow />
          ) : data && data.mustDo.length > 0 ? (
            <TaskList data={data} list="mustDo" onToggle={onToggle} isPending={isPending} />
          ) : (
            <QuietHint
              headline="Günün üç şeyi henüz seçilmedi."
              hint="En çok fark yaratacak üç işi buraya al."
            />
          )}
        </SectionCard>

        <SectionCard
          label="BUGÜNÜN GÖREVLERİ"
          count={data ? String(data.open.length) : '—'}
        >
          {tasksQuery.isPending ? (
            <LoadingRow />
          ) : data && data.open.length > 0 ? (
            <TaskList data={data} list="open" onToggle={onToggle} isPending={isPending} />
          ) : (
            <QuietHint
              headline="Bugün için başka görev yok."
              hint="Merkezdeki + ile yakala; istersen must-do'ya yükselt."
            />
          )}
        </SectionCard>

        {data && data.done.length > 0 ? (
          <SectionCard
            label="TAMAMLANANLAR"
            count={String(data.done.length)}
            glowing={true}
          >
            <TaskList data={data} list="done" onToggle={onToggle} isPending={isPending} />
          </SectionCard>
        ) : null}

        <Timeline />
      </ScrollView>
    </Screen>
  );
}

// ─── Parçalar ────────────────────────────────────────────────────────────────

function SectionCard({
  label,
  count,
  action,
  children,
  glowing = false,
}: {
  label: string;
  count: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  glowing?: boolean;
}) {
  const { c, space, radius } = useTheme();

  return (
    <View
      style={[
        styles.cardBase,
        {
          marginTop: space.md,
          paddingHorizontal: space.md,
          paddingTop: space.sm,
          paddingBottom: space.xs,
          backgroundColor: c.surface,
          borderRadius: radius.card,
          borderWidth: glowing ? StyleSheet.hairlineWidth : 0,
          borderColor: glowing ? c.accent : c.border,
          ...(glowing && glow.soft),
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <AppText
          variant="meta"
          style={{
            letterSpacing: 1.2,
            color: glowing ? c.focus : c.accent,
            fontWeight: '600',
          }}
        >
          {label}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
          <AppText variant="meta" faint>
            {count}
          </AppText>
          {action}
        </View>
      </View>

      {children}
    </View>
  );
}

function TaskList({
  data,
  list,
  onToggle,
  isPending,
}: {
  data: DayTasks;
  list: keyof DayTasks;
  onToggle: (id: string, done: boolean) => void;
  isPending: (id: string) => boolean;
}) {
  const { c } = useTheme();
  return (
    <View>
      {data[list].map((task, index) => (
        <View
          key={task.id}
          style={index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : undefined}
        >
          <TaskRow
            task={task}
            pending={isPending(task.id)}
            onToggle={(done) => onToggle(task.id, done)}
          />
        </View>
      ))}
    </View>
  );
}

function QuietHint({ headline, hint }: { headline: string; hint: string }) {
  const { space } = useTheme();
  return (
    <View style={{ paddingVertical: space.lg, gap: space.xxs }}>
      <AppText variant="body" muted>
        {headline}
      </AppText>
      <AppText variant="meta" faint>
        {hint}
      </AppText>
    </View>
  );
}

function LoadingRow() {
  const { space } = useTheme();
  return (
    <View style={{ paddingVertical: space.lg, alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}

function ErrorBanner({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { c, space, radius } = useTheme();
  return (
    <View
      style={{
        marginTop: space.md,
        padding: space.md,
        backgroundColor: c.surface,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.danger,
        gap: space.xs,
      }}
      accessibilityRole="alert"
    >
      <AppText variant="meta" style={{ color: c.danger }}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="ghost" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    backgroundColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  cardAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
