import { and, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { focusSessions, ideas, notes, tasks } from '@/db/schema';
import type { IdeaStatus } from '@/features/ideas/service';
import { addLocalDays, localDayKey, startOfLocalDay } from '@/lib/date';

/**
 * İstatistik servisi.
 *
 * Tek doğruluk kaynağı veritabanıdır: odak dakikaları `focus_sessions`,
 * tamamlanan görevler `tasks.completed_at` üzerinden hesaplanır. Ekranda
 * tutulan sayaç yoktur; böylece uygulama yeniden açıldığında da doğru kalır.
 */

export type RangeDays = 7 | 30;

export type DailyActivity = {
  dayKey: string;
  /** Kısa gün adı: Pzt, Sal... */
  weekday: string;
  /** O gün tamamlanan odak dakikası. */
  focusMinutes: number;
  /** O gün bitirilen odak bloğu sayısı. */
  sessions: number;
  /** O gün tamamlanan görev sayısı. */
  tasksDone: number;
  /** Grafikte çubuk yüksekliğini belirleyen toplam etkinlik. */
  total: number;
};

export type IdeaCounts = Record<IdeaStatus, number>;

export type StatsSummary = {
  rangeDays: RangeDays;
  points: DailyActivity[];
  totalFocusMinutes: number;
  totalSessions: number;
  totalTasksDone: number;
  activeDays: number;
  /** Bugünden (veya dünden) geriye kesintisiz etkin gün sayısı. */
  currentStreak: number;
  bestDayKey: string | null;
  bestDayMinutes: number;
  avgMinutesPerActiveDay: number;
  notesCount: number;
  ideasCount: number;
  ideaCounts: IdeaCounts;
  openTasks: number;
};

const shortWeekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });

function createSeries(days: number, end: Date): DailyActivity[] {
  const start = addLocalDays(end, -(days - 1));
  const points: DailyActivity[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = addLocalDays(start, index);
    points.push({
      dayKey: localDayKey(date),
      weekday: shortWeekday.format(date),
      focusMinutes: 0,
      sessions: 0,
      tasksDone: 0,
      total: 0,
    });
  }

  return points;
}

function indexByDay(points: DailyActivity[]): Map<string, DailyActivity> {
  return new Map(points.map((point) => [point.dayKey, point]));
}

function buildSeries(days: number, end: Date): DailyActivity[] {
  const points = createSeries(days, end);
  const byDay = indexByDay(points);
  const from = startOfLocalDay(addLocalDays(end, -(days - 1))).toISOString();
  const db = getDb();

  const sessionRows = db
    .select()
    .from(focusSessions)
    .where(and(gte(focusSessions.startedAt, from), isNotNull(focusSessions.endedAt)))
    .all();

  for (const session of sessionRows) {
    const point = byDay.get(localDayKey(new Date(session.startedAt)));
    if (!point) continue;
    const minutes = session.actualMin ?? session.plannedMin ?? 0;
    point.focusMinutes += Math.max(0, minutes);
    point.sessions += 1;
  }

  const taskRows = db
    .select()
    .from(tasks)
    .where(and(isNotNull(tasks.completedAt), gte(tasks.completedAt, from)))
    .all();

  for (const task of taskRows) {
    if (!task.completedAt) continue;
    const point = byDay.get(localDayKey(new Date(task.completedAt)));
    if (!point) continue;
    point.tasksDone += 1;
  }

  for (const point of points) {
    point.total = point.focusMinutes + point.tasksDone * 25;
  }

  return points;
}

function computeStreak(points: DailyActivity[], end: Date): number {
  const byDay = indexByDay(points);
  const isActive = (key: string) => {
    const point = byDay.get(key);
    return Boolean(point && (point.focusMinutes > 0 || point.tasksDone > 0));
  };

  let cursor = new Date(end);
  // Bugün henüz bir şey yapılmadıysa seriyi dünden say: gün bitmeden
  // "seri bitti" demek gereksiz bir ceza olur.
  if (!isActive(localDayKey(cursor))) {
    cursor = addLocalDays(cursor, -1);
  }

  let streak = 0;
  while (streak < points.length && isActive(localDayKey(cursor))) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streak;
}

function countNotes(): number {
  const row = getDb().select({ count: sql<number>`count(*)` }).from(notes).get();
  return row?.count ?? 0;
}

export function getStatsSummary(rangeDays: RangeDays = 7, end: Date = new Date()): StatsSummary {
  const points = buildSeries(rangeDays, end);
  const streakPoints = rangeDays >= 90 ? points : buildSeries(90, end);

  const totalFocusMinutes = points.reduce((sum, point) => sum + point.focusMinutes, 0);
  const totalSessions = points.reduce((sum, point) => sum + point.sessions, 0);
  const totalTasksDone = points.reduce((sum, point) => sum + point.tasksDone, 0);
  const activeDays = points.filter(
    (point) => point.focusMinutes > 0 || point.tasksDone > 0,
  ).length;

  let bestDayKey: string | null = null;
  let bestDayMinutes = 0;
  for (const point of points) {
    if (point.focusMinutes > bestDayMinutes) {
      bestDayMinutes = point.focusMinutes;
      bestDayKey = point.dayKey;
    }
  }

  const ideaRows = getDb().select({ status: ideas.status }).from(ideas).all();
  const ideaCounts: IdeaCounts = { spark: 0, saved: 0, committed: 0, archived: 0 };
  for (const idea of ideaRows) {
    ideaCounts[idea.status as IdeaStatus] += 1;
  }

  const openTaskRow = getDb()
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(eq(tasks.status, 'open'))
    .get();

  return {
    rangeDays,
    points,
    totalFocusMinutes,
    totalSessions,
    totalTasksDone,
    activeDays,
    currentStreak: computeStreak(streakPoints, end),
    bestDayKey,
    bestDayMinutes,
    avgMinutesPerActiveDay:
      activeDays > 0 ? Math.round(totalFocusMinutes / activeDays) : 0,
    notesCount: countNotes(),
    ideasCount: ideaRows.length,
    ideaCounts,
    openTasks: openTaskRow?.count ?? 0,
  };
}
