import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { usePressScale } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';
import { duration, spring, glow, radius, space as spaceTokens } from '@/ui/tokens';
import { weekdayName, dayKeyLabel, timeLabel, localDayKey, weekStartKey, addLocalDays } from '@/lib/date';
import { useWeekPlan, useScheduleTask, useUnscheduleTask } from './queries';
import { useDayTasks } from '@/features/tasks/queries';
import type { Task } from '@/db/schema';

const DAY_WIDTH = 120;

/**
 * Haftalık Plan — 7 sütunlu grid, drag-drop ile görev planlama.
 */
export function WeekView() {
  const { c } = useTheme();
  const [activeWeekStart, setActiveWeekStart] = useState(weekStartKey());
  const week = useWeekPlan(activeWeekStart);
  const schedule = useScheduleTask();
  const unschedule = useUnscheduleTask();

  // Global bugünkü görevler (suruklenebilir kaynak)
  const todayTasks = useDayTasks(localDayKey());

  const prevWeek = () => setActiveWeekStart((w) => localDayKey(addLocalDays(dateFromDayKey(w), -7)));
  const nextWeek = () => setActiveWeekStart((w) => localDayKey(addLocalDays(dateFromDayKey(w), 7)));

  const isCurrentWeek = activeWeekStart === weekStartKey();

  if (week.isPending) {
    return <View style={styles.loading}><Text>Yükleniyor...</Text></View>;
  }

  return (
    <View style={styles.container}>
      {/* Hafta navigasyonu */}
      <View style={styles.navBar}>
        <Pressable onPress={prevWeek} style={styles.navBtn} accessibilityLabel="Önceki hafta">
          <Ionicons name="chevron-back" size={28} color={c.text} />
        </Pressable>
        <View style={styles.navTitle}>
          <Text style={styles.weekLabel}>
            {week.data ? `${dayKeyLabel(week.data.weekStart)} — ${dayKeyLabel(week.data.days[6].date)}` : 'Hafta'}
          </Text>
          {isCurrentWeek && (
            <Text style={styles.currentBadge}>Bu Hafta</Text>
          )}
        </View>
        <Pressable onPress={nextWeek} style={styles.navBtn} accessibilityLabel="Sonraki hafta">
          <Ionicons name="chevron-forward" size={28} color={c.text} />
        </Pressable>
      </View>

      {/* 7 gün grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekRow}
        directionalLockEnabled
      >
        {week.data?.days.map((day, index) => (
          <DayColumn
            key={day.date}
            day={day}
            index={index}
            isToday={day.date === localDayKey()}
            availableTasks={todayTasks.data?.open ?? []}
            onSchedule={schedule.mutate}
            onUnschedule={unschedule.mutate}
            busy={schedule.isPending || unschedule.isPending}
          />
        ))}
      </ScrollView>

      {/* Kaynak görevler (bugünkü açık görevler) — sürüklenebilir */}
      {todayTasks.data && todayTasks.data.open.length > 0 && (
        <View style={styles.sourcePanel}>
          <Text style={styles.sourceTitle}>SÜRÜKLEYİP PLANLA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourceRow}>
            {todayTasks.data.open.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                onDragStart={() => haptic('tick')}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function dateFromDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

/* ==================== DayColumn ==================== */

interface DayColumnProps {
  day: {
    date: string;
    energy: number | null;
    intention: string | null;
    scheduledOpen: Task[];
    completed: Task[];
  };
  index: number;
  isToday: boolean;
  availableTasks: Task[];
  onSchedule: (params: { taskId: string; dayKey: string }) => void;
  onUnschedule: (taskId: string) => void;
  busy: boolean;
}

function DayColumn({ day, index, isToday, onSchedule, onUnschedule, busy }: DayColumnProps) {
  const { c } = useTheme();

  return (
    <View style={[styles.dayColumn, { borderColor: isToday ? c.accent : c.border }]}>
      {/* Başlık */}
      <View style={[styles.dayHeader, { backgroundColor: isToday ? c.accentSoft : c.surface }]}>
        <Text style={[styles.dayName, { color: isToday ? c.accent : c.text }]}>
          {weekdayName(dateFromDayKey(day.date)).slice(0, 3).toUpperCase()}
        </Text>
        <Text style={[styles.dayNumber, { color: isToday ? c.accent : c.text }]}>
          {new Date(day.date).getDate()}
        </Text>
      </View>

      {/* Energy */}
      {day.energy !== null && (
        <View style={styles.energyRow}>
          {[1, 2, 3, 4, 5].map((level) => (
            <View
              key={level}
              style={[
                styles.energyDot,
                level <= (day.energy ?? 0)
                  ? { backgroundColor: c.accent, ...glow.soft }
                  : { backgroundColor: c.border },
              ]}
            />
          ))}
        </View>
      )}

      {/* Intention */}
      {day.intention && (
        <Text style={styles.intention} numberOfLines={2}>
          {day.intention}
        </Text>
      )}

      {/* Planlanmış görevler — drop zone */}
      <View style={styles.taskList}>
        {day.scheduledOpen.map((task) => (
          <ScheduledTaskCard
            key={task.id}
            task={task}
            onUnschedule={() => onUnschedule(task.id)}
            busy={busy}
          />
        ))}
        {day.scheduledOpen.length === 0 && (
          <View style={styles.dropZone}>
            <Ionicons name="add-circle-outline" size={20} color={c.textFaint} />
            <Text style={styles.dropHint}>Bırak</Text>
          </View>
        )}
      </View>

      {/* Tamamlananlar */}
      {day.completed.length > 0 && (
        <View style={styles.doneSection}>
          <Text style={styles.doneLabel}>✓ {day.completed.length} tamamlandı</Text>
          {day.completed.slice(0, 3).map((task) => (
            <Text key={task.id} style={styles.doneTask}>
              {task.title}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/* ==================== ScheduledTaskCard ==================== */

interface ScheduledTaskCardProps {
  task: Task;
  onUnschedule: () => void;
  busy: boolean;
}

function ScheduledTaskCard({ task, onUnschedule, busy }: ScheduledTaskCardProps) {
  const { c } = useTheme();
  const { handlers } = usePressScale();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.scheduledCard, cardStyle]}>
      <Pressable
        {...handlers}
        onPress={() => haptic('tick')}
        style={styles.scheduledContent}
      >
        <View style={styles.scheduledMain}>
          {task.priority === 1 && <Ionicons name="star" size={12} color={c.accent} />}
          <Text style={styles.scheduledTitle} numberOfLines={1}>{task.title}</Text>
        </View>
        {task.scheduledAt && (
          <Text style={styles.scheduledTime}>{timeLabel(task.scheduledAt)}</Text>
        )}
      </Pressable>
      <Pressable
        onPress={onUnschedule}
        disabled={busy}
        accessibilityLabel="Planlamayı kaldır"
        style={styles.unscheduleBtn}
      >
        <Ionicons name="close" size={16} color={c.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

/* ==================== DraggableTaskCard (kaynak panel) ==================== */

interface DraggableTaskCardProps {
  task: Task;
  onDragStart: () => void;
}

function DraggableTaskCard({ task, onDragStart }: DraggableTaskCardProps) {
  const { c } = useTheme();
  const { handlers } = usePressScale();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const onGestureEvent = (event: any) => {
    // eslint-disable-next-line react-hooks/immutability
    translateX.value = event.nativeEvent.translationX;
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = event.nativeEvent.translationY;
  };

  const onHandlerStateChange = ({ nativeEvent }: { nativeEvent: { state: number } }) => {
    if (nativeEvent.state === State.BEGAN) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withSpring(1.05, spring.snappy);
      // eslint-disable-next-line react-hooks/immutability
      opacity.value = withTiming(0.8, { duration: duration.fast });
      runOnJS(onDragStart)();
    } else if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
      scale.value = withSpring(1, spring.snappy);
      opacity.value = withTiming(1, { duration: duration.fast });
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = withSpring(0, spring.snappy);
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = withSpring(0, spring.snappy);
    }
  };

  return (
    <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
      <Animated.View style={[styles.draggableCard, animatedStyle]}>
        <Pressable
          {...handlers}
          style={[
            styles.draggableContent,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          {task.priority === 1 && (
            <Ionicons name="star" size={14} color={c.accent} style={styles.dragStar} />
          )}
          <Text style={styles.dragTitle} numberOfLines={1}>{task.title}</Text>
          {task.energy && (
            <Ionicons
              name={(task.energy === 'high' ? 'flash' : task.energy === 'mid' ? 'battery-half' : 'battery-low') as any}
              size={14}
              color={c.accent}
            />
          )}
        </Pressable>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00000000',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spaceTokens.md,
    paddingVertical: spaceTokens.sm,
    gap: spaceTokens.md,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    alignItems: 'center',
    gap: spaceTokens.md,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E8A33D',
    backgroundColor: '#E8A33D22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spaceTokens.md,
    gap: spaceTokens.sm,
    minHeight: 500,
  },
  dayColumn: {
    width: DAY_WIDTH,
    minHeight: 400,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#16161A',
    overflow: 'hidden',
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: spaceTokens.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A32',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '300',
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spaceTokens.xs,
    paddingHorizontal: spaceTokens.sm,
  },
  energyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  intention: {
    fontSize: 11,
    paddingHorizontal: spaceTokens.sm,
    paddingBottom: spaceTokens.xs,
    color: '#9A948C',
    fontStyle: 'italic',
  },
  taskList: {
    flex: 1,
    paddingHorizontal: spaceTokens.xs,
    paddingTop: spaceTokens.xs,
    gap: spaceTokens.xs,
  },
  scheduledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E24',
    borderRadius: radius.md,
    paddingHorizontal: spaceTokens.sm,
    paddingVertical: spaceTokens.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2A32',
    ...glow.soft,
  },
  scheduledContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaceTokens.xs,
    flex: 1,
  },
  scheduledMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  scheduledTitle: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  scheduledTime: {
    fontSize: 10,
    color: '#8A847C',
  },
  unscheduleBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spaceTokens.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#3A3A44',
    borderRadius: radius.md,
    marginTop: spaceTokens.xs,
  },
  dropHint: {
    fontSize: 11,
    color: '#787168',
  },
  doneSection: {
    paddingHorizontal: spaceTokens.sm,
    paddingTop: spaceTokens.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2A2A32',
  },
  doneLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7BE0AD',
    marginBottom: spaceTokens.xs,
  },
  doneTask: {
    fontSize: 11,
    color: '#8A847C',
    marginBottom: 2,
    textDecorationLine: 'line-through',
  },
  sourcePanel: {
    marginTop: spaceTokens.lg,
    paddingHorizontal: spaceTokens.md,
  },
  sourceTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#E8A33D',
    marginBottom: spaceTokens.sm,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: spaceTokens.sm,
  },
  draggableCard: {
    width: 160,
  },
  draggableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spaceTokens.xs,
    padding: spaceTokens.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  dragStar: {
    marginRight: 2,
  },
  dragTitle: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});