import { and, desc, eq, gte, lt, or, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { dailyPlans, tasks, type Task } from '@/db/schema';
import { addLocalDays, dateFromDayKey, dayBounds, localDayKey } from '@/lib/date';

export type WeekView = {
  weekStart: string; // YYYY-MM-DD (Monday)
  days: DayPlan[];
};

export type DayPlan = {
  date: string; // YYYY-MM-DD
  energy: number | null;
  intention: string | null;
  tasks: Task[];
  /** Gün içinde planlanan (scheduledAt bu güne düşen) açık görevler */
  scheduledOpen: Task[];
  /** Bu gün tamamlanan görevler */
  completed: Task[];
};

export type MonthView = {
  monthStart: string; // YYYY-MM-01
  weeks: WeekView[];
};

/** ISO hafta başlangıcı (Pazartesi) */
export function weekStartKey(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // Pazartesi'ye git
  d.setDate(d.getDate() + diff);
  return localDayKey(d);
}

/** Ay başlangıcı */
export function monthStartKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(1);
  return localDayKey(d);
}

/** Hafta planı getir (7 gün) */
export function getWeekPlan(weekStart: string = weekStartKey()): WeekView {
  const db = getDb();
  const startDate = dateFromDayKey(weekStart);
  const days: DayPlan[] = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = addLocalDays(startDate, i);
    const dayKey = localDayKey(dayDate);
    const bounds = dayBounds(dayDate);

    // Daily plan (energy, intention)
    const plan = db
      .select()
      .from(dailyPlans)
      .where(eq(dailyPlans.date, dayKey))
      .get();

    // Bu güne planlanan açık görevler
    const scheduledOpen = db
      .select()
      .from(tasks)
      .where(
        and(
          gte(tasks.scheduledAt, bounds.start),
          lt(tasks.scheduledAt, bounds.end),
          eq(tasks.status, 'open'),
        ),
      )
      .orderBy(desc(tasks.priority), sql`${tasks.sortOrder}`)
      .all();

    // Bu gün tamamlanan
    const completed = db
      .select()
      .from(tasks)
      .where(
        and(
          gte(tasks.completedAt, bounds.start),
          lt(tasks.completedAt, bounds.end),
          or(eq(tasks.status, 'done'), eq(tasks.status, 'dropped')),
        ),
      )
      .orderBy(desc(sql`${tasks.completedAt}`))
      .all();

    // Bugünün tüm açık görevleri (must-do + scheduled + inbox)
    const allOpen = db
      .select()
      .from(tasks)
      .where(
        or(
          and(gte(tasks.scheduledAt, bounds.start), lt(tasks.scheduledAt, bounds.end)),
          and(eq(tasks.priority, 1), eq(tasks.status, 'open')),
        ),
      )
      .orderBy(desc(tasks.priority), sql`${tasks.sortOrder}`)
      .all();

    days.push({
      date: dayKey,
      energy: plan?.energy ?? null,
      intention: plan?.intention ?? null,
      tasks: allOpen,
      scheduledOpen,
      completed,
    });
  }

  return { weekStart, days };
}

/** Ay planı (4-6 hafta) */
export function getMonthPlan(monthStart: string = monthStartKey()): MonthView {
  const startDate = dateFromDayKey(monthStart);
  const weeks: WeekView[] = [];

  // Ayın ilk gününün hafta başlangıcı
  const firstWeekStart = weekStartKey(startDate);
  let currentWeekStart = firstWeekStart;

  for (let w = 0; w < 6; w++) {
    const week = getWeekPlan(currentWeekStart);
    weeks.push(week);

    // Son hafta ayın son gününü geçiyorsa dur
    const lastDay = dateFromDayKey(week.days[6].date);
    if (lastDay.getMonth() !== startDate.getMonth() && w >= 4) break;

    currentWeekStart = localDayKey(addLocalDays(dateFromDayKey(currentWeekStart), 7));
  }

  return { monthStart, weeks };
}

/** Günlük plan güncelle (energy/intention) */
export function upsertDailyPlan(
  date: string,
  patch: { energy?: number | null; intention?: string | null; capacityMin?: number | null }
): void {
  const db = getDb();
  const existing = db.select().from(dailyPlans).where(eq(dailyPlans.date, date)).get();

  if (existing) {
    db.update(dailyPlans)
      .set({ ...patch })
      .where(eq(dailyPlans.date, date))
      .run();
  } else {
    db.insert(dailyPlans)
      .values({ date, ...patch })
      .run();
  }
}

/** Görevi güne planla (scheduledAt ayarla) */
export function scheduleTaskToDay(taskId: string, dayKey: string): Task {
  const db = getDb();
  const bounds = dayBounds(dateFromDayKey(dayKey));

  db.update(tasks)
    .set({ scheduledAt: bounds.start })
    .where(eq(tasks.id, taskId))
    .run();

  const updated = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!updated) throw new Error('Görev bulunamadı');
  return updated;
}

/** Görevin planlamasını kaldır (scheduledAt = null) */
export function unscheduleTask(taskId: string): Task {
  const db = getDb();

  db.update(tasks)
    .set({ scheduledAt: null })
    .where(eq(tasks.id, taskId))
    .run();

  const updated = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!updated) throw new Error('Görev bulunamadı');
  return updated;
}