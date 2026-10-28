import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { glow, radius, space as sp } from '@/ui/tokens';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import {
  addLocalDays,
  dateFromDayKey,
  localDayKey,
  weekStartKey,
} from '@/lib/date';
import { useOpenTasks, useToggleTask } from '@/features/tasks/queries';
import type { DayPlan } from './service';
import { planKeys, useScheduleTask, useUnscheduleTask, useWeekPlan } from './queries';
import type { Task } from '@/db/schema';

const DAY_WIDTH = 120;
const DAY_GAP = sp.sm;
const LONG_PRESS_MS = 250;
/** Tamamlananlar bölümünde gösterilen başlık sayısı; gerisi "+N daha" olur. */
const COMPLETED_PREVIEW = 2;
const SOURCE = '__source__';
const WEEKDAYS = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];

const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
const longWeekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' });

/** Web'de `measureInWindow` görüntü alanı, işaretçi olayları sayfa koordinatı verir. */
function pageScrollOffset(): { x: number; y: number } {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return { x: window.scrollX, y: window.scrollY };
  }
  return { x: 0, y: 0 };
}

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

type DragController = {
  begin: (input: {
    task: Task;
    fromDay: string | null;
    card: Rect;
    pointer: Point;
  }) => void;
  move: (pointer: Point) => void;
  end: () => void;
  cancel: () => void;
};

type DragState = {
  task: Task;
  fromDay: string | null;
  width: number;
  height: number;
};

/**
 * Haftalık Plan — yedi sütun, gerçek sürükle-bırak.
 *
 * Sürüklenen kart yerinde soluklaşır, parmak/fare altında kök seviyesinde
 * bir önizleme gezer. Kolonlar sürükleme başında bir kez ölçülür; her
 * karede ölçüm yapılmaz. Sürükleme çalışmayan ortamlar için karta
 * dokunmak yedi günlük seçim sheet'ini açar.
 */
export function WeekView({
  weekStart,
  onWeekChange,
  focusDay,
}: {
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
  focusDay?: string | null;
}) {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const queryClient = useQueryClient();

  const week = useWeekPlan(weekStart);
  const schedule = useScheduleTask();
  const unschedule = useUnscheduleTask();
  const toggle = useToggleTask();
  const openTasks = useOpenTasks();

  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pickerTask, setPickerTask] = useState<Task | null>(null);
  const [gridHeight, setGridHeight] = useState(0);

  const rootRef = useRef<ViewInstance | null>(null);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const panelRef = useRef<ViewInstance | null>(null);
  const columnRefs = useRef<Record<string, ViewInstance | null>>({});

  const originRef = useRef<Point>({ x: 0, y: 0 });
  const columnRects = useRef<Record<string, Rect>>({});
  const panelRect = useRef<Rect | null>(null);
  const dropTargetRef = useRef<string | null>(null);
  const dragContext = useRef<{
    task: Task;
    fromDay: string | null;
    grabX: number;
    grabY: number;
  } | null>(null);

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const dragging = drag !== null;
  const dragTaskId = drag?.task.id ?? null;

  const measureOrigin = useCallback(() => {
    rootRef.current?.measureInWindow((x, y) => {
      const offset = pageScrollOffset();
      originRef.current = { x: x + offset.x, y: y + offset.y };
    });
  }, []);

  // Pencere boyutu değişince kökün ekran üzerindeki yeri değişebilir.
  // Ölçüm yalnızca sürükleme başında gerekli; yine de taze tutulur.
  useEffect(() => {
    measureOrigin();
  }, [measureOrigin, windowWidth, windowHeight]);

  /** Kolon ve panel dikdörtgenlerini sürükleme başında bir kez ölçer. */
  const measureDropZones = useCallback(() => {
    const offset = pageScrollOffset();
    for (const [date, node] of Object.entries(columnRefs.current)) {
      node?.measureInWindow((x, y, width, height) => {
        columnRects.current[date] = {
          x: x + offset.x,
          y: y + offset.y,
          width,
          height,
        };
      });
    }
    panelRef.current?.measureInWindow((x, y, width, height) => {
      panelRect.current = { x: x + offset.x, y: y + offset.y, width, height };
    });
  }, []);

  const hitTest = useCallback((point: Point): string | null => {
    for (const [date, rect] of Object.entries(columnRects.current)) {
      if (
        point.x >= rect.x - DAY_GAP / 2 &&
        point.x <= rect.x + rect.width + DAY_GAP / 2 &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
      ) {
        return date;
      }
    }

    const panel = panelRect.current;
    if (
      panel &&
      point.x >= panel.x &&
      point.x <= panel.x + panel.width &&
      point.y >= panel.y &&
      point.y <= panel.y + panel.height
    ) {
      return SOURCE;
    }

    return null;
  }, []);

  const clearDrag = useCallback(() => {
    dragContext.current = null;
    dropTargetRef.current = null;
    setDropTarget(null);
    setDrag(null);
  }, []);

  const begin = useCallback(
    (input: { task: Task; fromDay: string | null; card: Rect; pointer: Point }) => {
      dragContext.current = {
        task: input.task,
        fromDay: input.fromDay,
        grabX: input.pointer.x - input.card.x,
        grabY: input.pointer.y - input.card.y,
      };

      dragX.set(input.card.x - originRef.current.x);
      dragY.set(input.card.y - originRef.current.y);

      measureOrigin();
      measureDropZones();

      dropTargetRef.current = input.fromDay;
      setDropTarget(input.fromDay);
      setDrag({
        task: input.task,
        fromDay: input.fromDay,
        width: Math.max(input.card.width, 96),
        height: Math.max(input.card.height, 40),
      });
      haptic('tick');
    },
    [dragX, dragY, measureDropZones, measureOrigin],
  );

  const move = useCallback(
    (pointer: Point) => {
      const context = dragContext.current;
      if (!context) return;

      dragX.set(pointer.x - originRef.current.x - context.grabX);
      dragY.set(pointer.y - originRef.current.y - context.grabY);

      const next = hitTest(pointer);
      if (next !== dropTargetRef.current) {
        dropTargetRef.current = next;
        setDropTarget(next);
      }
    },
    [dragX, dragY, hitTest],
  );

  const end = useCallback(() => {
    const context = dragContext.current;
    const target = dropTargetRef.current;
    clearDrag();
    if (!context) return;

    if (target && target !== SOURCE && target !== context.fromDay) {
      haptic('light');
      schedule.mutate(
        { taskId: context.task.id, dayKey: target },
        { onError: () => toast('Görev taşınamadı', 'error') },
      );
      return;
    }

    if (target === SOURCE && context.fromDay) {
      haptic('light');
      unschedule.mutate(context.task.id, {
        onError: () => toast('Planlama kaldırılamadı', 'error'),
      });
    }
  }, [clearDrag, schedule, unschedule]);

  const cancel = useCallback(() => {
    clearDrag();
  }, [clearDrag]);

  const controller = useMemo<DragController>(
    () => ({ begin, move, end, cancel }),
    [begin, cancel, end, move],
  );

  const toggleTask = useCallback(
    (task: Task, done: boolean) => {
      toggle.mutate(
        { id: task.id, done },
        {
          onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: planKeys.all });
          },
        },
      );
    },
    [queryClient, toggle],
  );

  const openTask = useCallback((task: Task) => {
    haptic('light');
    router.push(`/task/${task.id}`);
  }, []);

  const pickDay = useCallback(
    (task: Task, dayKey: string) => {
      setPickerTask(null);
      haptic('light');
      schedule.mutate(
        { taskId: task.id, dayKey },
        {
          onError: () => toast('Görev planlanamadı', 'error'),
        },
      );
    },
    [schedule],
  );

  // Aylık görünümden gelindiğinde o günü görünür alana getir. Aynı odak
  // için her plan yenilemesinde yeniden kaydırmayız.
  const focusKey = focusDay ? `${weekStart}:${focusDay}` : null;
  const lastFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusDay || !focusKey || lastFocusRef.current === focusKey) return;
    const index = week.data?.days.findIndex((day) => day.date === focusDay) ?? -1;
    if (index < 0) return;
    lastFocusRef.current = focusKey;
    scrollRef.current?.scrollTo({
      x: Math.max(0, index * (DAY_WIDTH + DAY_GAP)),
      animated: true,
    });
  }, [focusDay, focusKey, week.data?.days]);

  const visibleEnd = localDayKey(addLocalDays(dateFromDayKey(weekStart), 6));

  /**
   * Kaynak panel: görünür haftanın dışında kalan açık görevler. Böylece
   * bir kolondan planlaması kaldırılan görev de panelde yeniden doğar.
   */
  const panelTasks = useMemo(() => {
    const list = openTasks.data ?? [];
    return list.filter((task) => {
      if (!task.scheduledAt) return true;
      const day = localDayKey(new Date(task.scheduledAt));
      return day < weekStart || day > visibleEnd;
    });
  }, [openTasks.data, visibleEnd, weekStart]);

  const goWeek = (delta: number) => {
    if (!dragging) onWeekChange(localDayKey(addLocalDays(dateFromDayKey(weekStart), delta)));
  };

  const isCurrentWeek = weekStart === weekStartKey();
  const days = week.data?.days ?? [];
  const rangeLabel =
    days.length === 7
      ? `${shortDate.format(dateFromDayKey(days[0].date))} – ${shortDate.format(
          dateFromDayKey(days[6].date),
        )}`
      : 'Hafta';

  if (week.isPending) {
    return (
      <View style={styles.center}>
        <AppText variant="body" muted>
          Plan yükleniyor...
        </AppText>
      </View>
    );
  }

  if (week.isError) {
    return (
      <View style={[styles.center, { gap: sp.sm }]}>
        <AppText variant="section" style={{ color: c.danger }}>
          Plan yüklenemedi
        </AppText>
        <Button label="Yeniden dene" variant="secondary" onPress={() => void week.refetch()} />
      </View>
    );
  }

  return (
    <View ref={rootRef} style={styles.root}>
      <View style={styles.navBar}>
        <Pressable
          onPress={() => goWeek(-7)}
          disabled={dragging}
          accessibilityRole="button"
          accessibilityLabel="Önceki hafta"
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={22} color={dragging ? c.textFaint : c.text} />
        </Pressable>

        <View style={styles.navTitle}>
          <AppText variant="section">{rangeLabel}</AppText>
          {isCurrentWeek ? (
            <AppText
              variant="meta"
              style={[
                styles.badge,
                { color: c.accent, backgroundColor: c.accentSoft },
              ]}
            >
              Bu hafta
            </AppText>
          ) : null}
        </View>

        <Pressable
          onPress={() => goWeek(7)}
          disabled={dragging}
          accessibilityRole="button"
          accessibilityLabel="Sonraki hafta"
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={22} color={dragging ? c.textFaint : c.text} />
        </Pressable>
      </View>

      <View
        style={styles.gridWrap}
        onLayout={(event) => setGridHeight(event.nativeEvent.layout.height)}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          scrollEnabled={!dragging}
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled
          contentContainerStyle={styles.weekRow}
        >
          {days.map((day) => {
            const isToday = day.date === localDayKey();
            const columnHeight = gridHeight > 0 ? gridHeight : 360;

            return (
              <DayColumn
                key={day.date}
                day={day}
                height={columnHeight}
                isToday={isToday}
                focused={focusDay === day.date}
                dropActive={dropTarget === day.date}
                dragging={dragging}
                dragTaskId={dragTaskId}
                controller={controller}
                onToggle={toggleTask}
                onOpenTask={openTask}
                onUnschedule={(taskId) =>
                  unschedule.mutate(taskId, {
                    onError: () => toast('Planlama kaldırılamadı', 'error'),
                  })
                }
                setColumnRef={(node) => {
                  columnRefs.current[day.date] = node;
                }}
              />
            );
          })}
        </ScrollView>
      </View>

      <View
        ref={panelRef}
        style={[
          styles.sourcePanel,
          {
            borderTopColor: dropTarget === SOURCE ? c.accent : c.border,
            backgroundColor: dropTarget === SOURCE ? c.accentSoft : c.surface,
            paddingBottom: insets.bottom + sp.xs,
          },
        ]}
      >
        <View style={styles.sourceHeader}>
          <AppText variant="meta" muted style={{ letterSpacing: 1 }}>
            PLANLANMAMIŞ
          </AppText>
          <AppText variant="meta" faint>
            {panelTasks.length > 0
              ? `${panelTasks.length} görev · sürükleyip bir güne bırak`
              : 'Bu hafta dışında açık görev yok'}
          </AppText>
        </View>

        <ScrollView
          horizontal
          scrollEnabled={!dragging}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourceRow}
        >
          {panelTasks.map((task) => (
            <SourceTaskCard
              key={task.id}
              task={task}
              dimmed={dragTaskId === task.id}
              controller={controller}
              onPickDay={() => setPickerTask(task)}
            />
          ))}
          {panelTasks.length === 0 ? (
            <AppText variant="meta" faint style={{ paddingVertical: sp.xs }}>
              Haftaya bir görev bıraktığınızda buradan kaybolur.
            </AppText>
          ) : null}
        </ScrollView>
      </View>

      {drag ? (
        <DragPreview
          task={drag.task}
          width={drag.width}
          height={drag.height}
          x={dragX}
          y={dragY}
          dark={dark}
        />
      ) : null}

      <DayPickerSheet
        task={pickerTask}
        weekStart={weekStart}
        onSelect={(task, dayKey) => pickDay(task, dayKey)}
        onClose={() => setPickerTask(null)}
      />
    </View>
  );
}

/* ==================== Gün kolonu ==================== */

function DayColumn({
  day,
  height,
  isToday,
  focused,
  dropActive,
  dragging,
  dragTaskId,
  controller,
  onToggle,
  onOpenTask,
  onUnschedule,
  setColumnRef,
}: {
  day: DayPlan;
  height: number;
  isToday: boolean;
  focused: boolean;
  dropActive: boolean;
  dragging: boolean;
  dragTaskId: string | null;
  controller: DragController;
  onToggle: (task: Task, done: boolean) => void;
  onOpenTask: (task: Task) => void;
  onUnschedule: (taskId: string) => void;
  setColumnRef: (node: ViewInstance | null) => void;
}) {
  const { c, dark } = useTheme();
  const date = dateFromDayKey(day.date);
  const empty = day.scheduledOpen.length === 0;

  return (
    <View
      ref={setColumnRef}
      style={[
        styles.column,
        {
          height,
          backgroundColor: dropActive ? c.accentSoft : c.surface,
          borderColor: dropActive || focused || isToday ? c.accent : c.border,
          borderWidth: dropActive ? 1.5 : StyleSheet.hairlineWidth,
        },
        dark && dropActive ? glow.soft : undefined,
      ]}
    >
      <View
        style={[
          styles.dayHeader,
          {
            backgroundColor: isToday ? c.accentSoft : c.surfaceRaised,
            borderBottomColor: c.border,
          },
        ]}
      >
        <AppText
          variant="meta"
          style={[styles.dayName, { color: isToday ? c.accent : c.textMuted }]}
        >
          {WEEKDAYS[(date.getDay() + 6) % 7]}
        </AppText>
        <AppText variant="title" style={{ color: isToday ? c.accent : c.text }}>
          {date.getDate()}
        </AppText>
      </View>

      {day.energy !== null ? (
        <View style={styles.energyRow}>
          {[1, 2, 3, 4, 5].map((level) => (
            <View
              key={level}
              style={[
                styles.energyDot,
                {
                  backgroundColor: level <= (day.energy ?? 0) ? c.accent : c.border,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      {day.intention ? (
        <AppText variant="meta" muted numberOfLines={2} style={styles.intention}>
          {day.intention}
        </AppText>
      ) : null}

      <ScrollView
        style={styles.taskList}
        contentContainerStyle={[styles.taskListContent, empty && styles.taskListEmpty]}
        scrollEnabled={!dragging}
        showsVerticalScrollIndicator={false}
      >
        {day.scheduledOpen.map((task) => (
          <ScheduledTaskCard
            key={task.id}
            task={task}
            fromDay={day.date}
            dimmed={dragTaskId === task.id}
            controller={controller}
            onToggle={onToggle}
            onOpenTask={onOpenTask}
            onUnschedule={onUnschedule}
          />
        ))}

        {empty ? (
          <View
            style={[
              styles.dropZone,
              {
                borderColor: dropActive ? c.accent : c.borderStrong,
                backgroundColor: dropActive ? c.accentSoft : 'transparent',
              },
            ]}
          >
            <Ionicons
              name={dropActive ? 'arrow-down-circle' : 'add-circle-outline'}
              size={18}
              color={dropActive ? c.accent : c.textFaint}
            />
            <AppText
              variant="meta"
              faint={!dropActive}
              style={{ fontSize: 10, color: dropActive ? c.accent : undefined }}
            >
              Bırak
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      {day.completed.length > 0 ? (
        <View style={[styles.doneSection, { borderTopColor: c.border }]}>
          <AppText variant="meta" style={[styles.doneLabel, { color: c.focus }]}>
            ✓ {day.completed.length} tamamlandı
          </AppText>
          {day.completed.slice(0, COMPLETED_PREVIEW).map((task) => (
            <AppText
              key={task.id}
              variant="meta"
              faint
              numberOfLines={1}
              style={styles.doneTask}
            >
              {task.title}
            </AppText>
          ))}
          {day.completed.length > COMPLETED_PREVIEW ? (
            <AppText variant="meta" faint style={styles.doneTask}>
              +{day.completed.length - COMPLETED_PREVIEW} daha
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ==================== Kartlar ==================== */

function useCardGesture({
  task,
  fromDay,
  longPressMs,
  controller,
}: {
  task: Task;
  fromDay: string | null;
  longPressMs: number;
  controller: DragController;
}) {
  const cardRef = useRef<ViewInstance | null>(null);
  const pressStart = useRef(0);

  // PanResponder işleyicileri yalnızca jest sırasında çalışır; basış
  // zamanı ve kart ölçümü olay anında okunmalı. Derleyici kuralı bunu
  // render sırasında okuma sanıyor.
  /* eslint-disable react-hooks/refs, react-hooks/purity */
  const pan = useMemo(
    () =>
      PanResponder.create({
        // Dokunuş çocuk Pressable'da kalsın; sürükleme eşiği aşılınca
        // jesti biz devralırız. Böylece hem "aç" hem "taşı" çalışır.
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponderCapture: (_event, gesture) => {
          const moved = Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6;
          if (!moved) return false;
          if (longPressMs > 0 && Date.now() - pressStart.current < longPressMs) {
            return false;
          }
          return true;
        },
        onPanResponderGrant: (event: GestureResponderEvent, gesture: PanResponderGestureState) => {
          const pointer = { x: gesture.x0, y: gesture.y0 };
          const fallback: Rect = {
            x: pointer.x - 80,
            y: pointer.y - 24,
            width: 160,
            height: 48,
          };
          const node = cardRef.current;

          if (node?.measureInWindow) {
            node.measureInWindow((x, y, width, height) => {
              const offset = pageScrollOffset();
              controller.begin({
                task,
                fromDay,
                card: { x: x + offset.x, y: y + offset.y, width, height },
                pointer,
              });
            });
          } else {
            controller.begin({ task, fromDay, card: fallback, pointer });
          }
        },
        onPanResponderMove: (_event, gesture) => {
          controller.move({ x: gesture.moveX, y: gesture.moveY });
        },
        onPanResponderRelease: () => controller.end(),
        onPanResponderTerminate: () => controller.cancel(),
        onPanResponderTerminationRequest: () => false,
      }),
    [controller, fromDay, longPressMs, task],
  );
  /* eslint-enable react-hooks/refs, react-hooks/purity */

  const onPressIn = useCallback(() => {
    pressStart.current = Date.now();
  }, []);

  return { cardRef, panHandlers: pan.panHandlers, onPressIn };
}

function CheckCircle({
  done,
  onPress,
  label,
}: {
  done: boolean;
  onPress: () => void;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="checkbox"
      aria-checked={done}
      accessibilityLabel={label}
      style={styles.checkTarget}
    >
      <View
        style={[
          styles.checkCircle,
          {
            borderColor: done ? c.focus : c.borderStrong,
            backgroundColor: done ? c.focusSoft : 'transparent',
          },
        ]}
      >
        {done ? <Ionicons name="checkmark" size={11} color={c.focus} /> : null}
      </View>
    </Pressable>
  );
}

function ScheduledTaskCard({
  task,
  fromDay,
  dimmed,
  controller,
  onToggle,
  onOpenTask,
  onUnschedule,
}: {
  task: Task;
  fromDay: string;
  dimmed: boolean;
  controller: DragController;
  onToggle: (task: Task, done: boolean) => void;
  onOpenTask: (task: Task) => void;
  onUnschedule: (taskId: string) => void;
}) {
  const { c, dark } = useTheme();
  const [hovered, setHovered] = useState(false);
  const { cardRef, panHandlers, onPressIn } = useCardGesture({
    task,
    fromDay,
    longPressMs: LONG_PRESS_MS,
    controller,
  });

  return (
    <View
      ref={cardRef}
      {...panHandlers}
      style={{ opacity: dimmed ? 0.3 : 1 }}
    >
      <View
        style={[
          styles.taskCard,
          {
            backgroundColor: c.surfaceRaised,
            borderColor: hovered ? c.borderStrong : c.border,
          },
          dark && glow.soft,
        ]}
      >
        <CheckCircle
          done={false}
          onPress={() => onToggle(task, true)}
          label={`${task.title}: tamamla`}
        />

        <Pressable
          onPress={() => onOpenTask(task)}
          onPressIn={onPressIn}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          accessible
          accessibilityRole="link"
          accessibilityLabel={`${task.title}. Düzenlemek için aç`}
          accessibilityHint="Taşımak için basılı tutup sürükleyin"
          style={styles.taskCardBody}
        >
          <View style={styles.taskCardTitleRow}>
            {task.priority === 1 ? (
              <Ionicons name="star" size={10} color={c.accent} />
            ) : null}
            <AppText
              numberOfLines={2}
              style={[styles.taskCardTitle, { color: hovered ? c.accent : c.text }]}
            >
              {task.title}
            </AppText>
          </View>
        </Pressable>

        <Pressable
          onPress={() => onUnschedule(task.id)}
          accessibilityRole="button"
          accessibilityLabel={`${task.title}: planlamayı kaldır`}
          style={styles.cardIconButton}
        >
          <Ionicons name="close" size={13} color={c.textFaint} />
        </Pressable>
      </View>
    </View>
  );
}

function SourceTaskCard({
  task,
  dimmed,
  controller,
  onPickDay,
}: {
  task: Task;
  dimmed: boolean;
  controller: DragController;
  onPickDay: () => void;
}) {
  const { c, dark } = useTheme();
  const [hovered, setHovered] = useState(false);
  const { cardRef, panHandlers, onPressIn } = useCardGesture({
    task,
    fromDay: null,
    longPressMs: 0,
    controller,
  });

  return (
    <View ref={cardRef} {...panHandlers} style={{ opacity: dimmed ? 0.3 : 1 }}>
      <Pressable
        onPress={onPickDay}
        onPressIn={onPressIn}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Görevi planla: ${task.title}`}
        accessibilityHint="Gün seçmek için aç; sürükleyerek de bırakabilirsiniz"
        style={[
          styles.sourceCard,
          {
            backgroundColor: c.surfaceRaised,
            borderColor: hovered ? c.accent : c.border,
          },
          dark && glow.soft,
        ]}
      >
        <View style={styles.sourceCardTop}>
          {task.priority === 1 ? <Ionicons name="star" size={11} color={c.accent} /> : null}
          <Ionicons name="calendar-outline" size={12} color={c.textFaint} />
        </View>
        <AppText
          numberOfLines={2}
          style={[styles.sourceCardTitle, { color: hovered ? c.accent : c.text }]}
        >
          {task.title}
        </AppText>
      </Pressable>
    </View>
  );
}

/* ==================== Sürükleme önizlemesi ==================== */

function DragPreview({
  task,
  width,
  height,
  x,
  y,
  dark,
}: {
  task: Task;
  width: number;
  height: number;
  x: SharedValue<number>;
  y: SharedValue<number>;
  dark: boolean;
}) {
  const { c } = useTheme();
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: 1.03 },
    ],
  }));

  return (
    <View pointerEvents="none" style={styles.previewLayer}>
      <Animated.View
        style={[
          styles.preview,
          {
            width,
            height,
            backgroundColor: c.surfaceRaised,
            borderColor: c.accent,
            borderRadius: radius.md,
          },
          dark ? glow.medium : undefined,
          style,
        ]}
      >
        <View style={styles.previewBody}>
          {task.priority === 1 ? (
            <Ionicons name="star" size={11} color={c.accent} />
          ) : null}
          <Text numberOfLines={2} style={[styles.previewTitle, { color: c.text }]}>
            {task.title}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

/* ==================== Gün seçici ==================== */

function DayPickerSheet({
  task,
  weekStart,
  onSelect,
  onClose,
}: {
  task: Task | null;
  weekStart: string;
  onSelect: (task: Task, dayKey: string) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const today = localDayKey();
  const tomorrow = localDayKey(addLocalDays(new Date(), 1));

  return (
    <Modal
      visible={task !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.sheetRoot, { backgroundColor: c.scrim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Gün seçimini kapat"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surfaceRaised,
              borderColor: c.border,
              paddingBottom: insets.bottom + sp.md,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="section">Güne planla</AppText>
              {task ? (
                <AppText variant="meta" muted numberOfLines={1}>
                  {task.title}
                </AppText>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              style={styles.cardIconButton}
            >
              <Ionicons name="close" size={19} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: sp.lg }}>
            {Array.from({ length: 7 }, (_, index) =>
              localDayKey(addLocalDays(dateFromDayKey(weekStart), index)),
            ).map((dayKey) => {
              const date = dateFromDayKey(dayKey);
              const badge =
                dayKey === today ? 'Bugün' : dayKey === tomorrow ? 'Yarın' : null;

              return (
                <Pressable
                  key={dayKey}
                  onPress={() => {
                    if (task) onSelect(task, dayKey);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${longWeekday.format(date)} ${shortDate.format(
                    date,
                  )} gününe planla`}
                  style={({ pressed }: { pressed: boolean }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: sp.sm,
                    paddingVertical: sp.sm,
                    paddingHorizontal: sp.xs,
                    borderRadius: radius.sm,
                    backgroundColor: pressed ? c.surface : 'transparent',
                    cursor: 'pointer',
                  })}
                >
                  <Ionicons
                    name={dayKey === today ? 'today-outline' : 'calendar-outline'}
                    size={16}
                    color={dayKey === today ? c.accent : c.textMuted}
                  />
                  <AppText variant="body" style={{ flex: 1, textTransform: 'capitalize' }}>
                    {longWeekday.format(date)}
                  </AppText>
                  <AppText variant="meta" muted>
                    {shortDate.format(date)}
                  </AppText>
                  {badge ? (
                    <AppText
                      variant="meta"
                      style={{
                        color: c.accent,
                        backgroundColor: c.accentSoft,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: radius.pill,
                        fontSize: 10,
                      }}
                    >
                      {badge}
                    </AppText>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ==================== Stiller ==================== */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp.lg,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp.xs,
    gap: sp.xs,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  navTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.xs,
  },
  badge: {
    fontSize: 10,
    letterSpacing: 0.4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  gridWrap: {
    flex: 1,
    minHeight: 0,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: DAY_GAP,
    paddingRight: sp.xs,
  },
  column: {
    width: DAY_WIDTH,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: sp.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayName: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: sp.sm,
  },
  energyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  intention: {
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: sp.sm,
    paddingBottom: 6,
    fontStyle: 'italic',
  },
  taskList: {
    flex: 1,
    minHeight: 0,
  },
  taskListContent: {
    paddingHorizontal: sp.xxs,
    paddingTop: sp.xxs,
    paddingBottom: sp.xs,
    gap: sp.xxs,
  },
  taskListEmpty: {
    flexGrow: 1,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 2,
    paddingRight: 2,
    minHeight: 44,
  },
  taskCardBody: {
    flex: 1,
    paddingVertical: 6,
    paddingRight: 2,
    cursor: 'pointer',
  },
  taskCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  taskCardTitle: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  checkTarget: {
    width: 26,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconButton: {
    width: 22,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  dropZone: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  doneSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: sp.xs,
    paddingTop: sp.xs,
    paddingBottom: sp.xs,
    gap: 2,
  },
  doneLabel: {
    fontSize: 11.5,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  doneTask: {
    fontSize: 11.5,
    lineHeight: 16,
    textDecorationLine: 'line-through',
  },
  sourcePanel: {
    marginTop: sp.sm,
    paddingTop: sp.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: sp.sm,
    marginBottom: sp.xs,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: sp.sm,
    paddingVertical: 2,
    paddingRight: sp.xs,
  },
  sourceCard: {
    width: 172,
    minHeight: 60,
    justifyContent: 'center',
    gap: 3,
    paddingVertical: sp.xs,
    paddingHorizontal: sp.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    cursor: 'pointer',
  },
  sourceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceCardTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  previewLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 20,
  },
  preview: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
  },
  previewBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewTitle: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingTop: sp.md,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: sp.lg,
    paddingBottom: sp.sm,
  },
});
