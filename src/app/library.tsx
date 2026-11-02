import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { TextField } from '@/ui/components/TextField';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/EmptyState';
import { SkeletonList } from '@/ui/components/Skeleton';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { addLocalDays, dayKeyLabel, localDayKey } from '@/lib/date';
import { TaskRow } from '@/features/tasks/TaskRow';
import { useOpenTasks, useRescheduleTask, useToggleTask } from '@/features/tasks/queries';
import type { Task } from '@/db/schema';

type Filter = 'all' | 'mustDo' | 'unscheduled';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'mustDo', label: 'Must-do' },
  { value: 'unscheduled', label: 'Tarihsiz' },
];

type Group = { key: string; label: string; tasks: Task[] };

function taskDayKey(task: Task): string | null {
  if (!task.scheduledAt) return null;
  const date = new Date(task.scheduledAt);
  return Number.isNaN(date.getTime()) ? null : localDayKey(date);
}

function groupTasks(tasks: Task[], todayKey: string, tomorrowKey: string): Group[] {
  const buckets = new Map<string, Task[]>();

  for (const task of tasks) {
    const key = taskDayKey(task) ?? 'none';
    const bucket = buckets.get(key);
    if (bucket) bucket.push(task);
    else buckets.set(key, [task]);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (a === 'none') return 1;
      if (b === 'none') return -1;
      return a.localeCompare(b);
    })
    .map(([key, group]) => ({
      key,
      label:
        key === 'none'
          ? 'TARİHSİZ'
          : key === todayKey
            ? 'BUGÜN'
            : key === tomorrowKey
              ? 'YARIN'
              : dayKeyLabel(key).toLocaleUpperCase('tr-TR'),
      tasks: [...group].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '');
      }),
    }));
}

/**
 * Tüm açık görevler.
 *
 * Today yalnızca bugünü gösterir; bu ekran "kalanlar nerede?" sorusunun
 * cevabıdır. Yeni bir sekme değil: Today'deki görev başlığından açılır,
 * böylece alt çubuk dört sekmede kalır.
 */
export default function LibraryScreen() {
  const { c, space, radius } = useTheme();
  const router = useRouter();
  const query = useOpenTasks();
  const toggle = useToggleTask();
  const reschedule = useRescheduleTask();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const todayKey = localDayKey();
  const tomorrowKey = localDayKey(addLocalDays(new Date(), 1));
  const needle = useMemo(() => search.trim().toLocaleLowerCase('tr-TR'), [search]);

  const groups = useMemo(() => {
    const tasks = (query.data ?? []).filter((task) => {
      if (filter === 'mustDo' && task.priority !== 1) return false;
      if (filter === 'unscheduled' && task.scheduledAt) return false;
      if (!needle) return true;
      return `${task.title} ${task.notes ?? ''}`
        .toLocaleLowerCase('tr-TR')
        .includes(needle);
    });

    return groupTasks(tasks, todayKey, tomorrowKey);
  }, [filter, needle, query.data, todayKey, tomorrowKey]);

  const count = (query.data ?? []).length;

  const scheduleToday = (task: Task) => {
    haptic('tick');
    reschedule.mutate(
      { id: task.id, scheduledAt: new Date().toISOString() },
      { onSuccess: () => toast('Bugüne alındı') },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader
        title="Tüm görevler"
        subtitle={count > 0 ? `${count} açık görev · bugün dahil` : 'Açık görev yok'}
        right={
          <Pressable
            onPress={() => {
              haptic('tick');
              router.push('/task/new');
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Yeni görev ekle"
            style={[
              styles.headerButton,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                borderRadius: radius.pill,
              },
            ]}
          >
            <Ionicons name="add" size={22} color={c.accent} />
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.sm }}>
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Görevlerde ara"
          accessibilityLabel="Görevlerde ara"
          returnKeyType="search"
          autoCorrect={false}
        />
        <View style={[styles.wrap, { gap: space.xs }]}>
          {FILTERS.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </View>
      </View>

      {query.isPending ? (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
          <SkeletonList rows={6} />
        </View>
      ) : query.isError ? (
        <EmptyState
          headline="Görevler okunamadı"
          hint="Veriler cihazda duruyor. Ekranı yeniden açmayı deneyin."
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="library-outline" size={32} color={c.textFaint} />}
          headline={search.trim() ? 'Aramaya uyan görev yok' : 'Kütüphane boş'}
          hint={
            search.trim()
              ? 'Başka bir kelime dene ya da filtreyi temizle.'
              : 'Yeni bir görev ekle; bugün dışındakiler burada birikir.'
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: space.xxl,
            gap: space.md,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <View key={group.key} style={{ gap: space.xs }}>
              <View style={styles.groupHeader}>
                <AppText
                  variant="meta"
                  muted
                  style={{ letterSpacing: 1.1, fontWeight: '600' }}
                >
                  {group.label}
                </AppText>
                <AppText variant="meta" faint>
                  {group.tasks.length}
                </AppText>
              </View>

              <View
                style={{
                  backgroundColor: c.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border,
                  borderRadius: radius.card,
                  overflow: 'hidden',
                  paddingHorizontal: space.sm,
                }}
              >
                {group.tasks.map((task, index) => (
                  <View
                    key={task.id}
                    style={
                      index > 0
                        ? {
                            borderTopWidth: StyleSheet.hairlineWidth,
                            borderTopColor: c.border,
                          }
                        : undefined
                    }
                  >
                    <TaskRow
                      task={task}
                      pending={toggle.isPending && toggle.variables?.id === task.id}
                      onToggle={(done) => toggle.mutate({ id: task.id, done })}
                      trailing={
                        taskDayKey(task) === todayKey ? undefined : (
                          <Pressable
                            onPress={() => scheduleToday(task)}
                            accessible
                            accessibilityRole="button"
                            accessibilityLabel={`${task.title}: bugüne al`}
                            hitSlop={4}
                            style={[
                              styles.rowAction,
                              {
                                borderRadius: radius.pill,
                                backgroundColor: c.surfaceRaised,
                                borderColor: c.border,
                              },
                            ]}
                          >
                            <Ionicons name="today-outline" size={16} color={c.textMuted} />
                          </Pressable>
                        )
                      }
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  rowAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
