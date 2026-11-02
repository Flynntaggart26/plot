import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { dailyPlans, taskEvents, tasks, type DailyPlan, type Task } from '@/db/schema';
import { addLocalDays, dateFromDayKey, localDayKey } from '@/lib/date';
import { newId } from '@/lib/id';
import { MUST_DO_LIMIT } from '@/features/tasks/service';

/**
 * Günün niyeti ve enerjisi. Enerji 1-5; `null` seçim yapılmadı demektir.
 * `daily_plans` satırı yoksa gün henüz "açılmamış"tır - okuma bunu yaratmaz.
 */
export function getDayEnergy(dayKey: string = localDayKey()): number | null {
  const row = getDb()
    .select({ energy: dailyPlans.energy })
    .from(dailyPlans)
    .where(eq(dailyPlans.date, dayKey))
    .get();
  return row?.energy ?? null;
}

export function setDayEnergy(energy: number, dayKey: string = localDayKey()): void {
  if (!Number.isInteger(energy) || energy < 1 || energy > 5) {
    throw new Error('Enerji 1 ile 5 arasında olmalı.');
  }

  getDb()
    .insert(dailyPlans)
    .values({ date: dayKey, energy })
    .onConflictDoUpdate({ target: dailyPlans.date, set: { energy } })
    .run();
}

/** Seçimi temizler; satır diğer alanları korumak için silinmez. */
export function clearDayEnergy(dayKey: string = localDayKey()): void {
  getDb().update(dailyPlans).set({ energy: null }).where(eq(dailyPlans.date, dayKey)).run();
}

export function getDayPlan(dayKey: string = localDayKey()): DailyPlan | null {
  return (
    getDb().select().from(dailyPlans).where(eq(dailyPlans.date, dayKey)).get() ?? null
  );
}

// ─── Günü kapat ──────────────────────────────────────────────────────────────

export type CloseDayInput = {
  dayKey?: string;
  /** Yarının listesine taşınacak görevler. */
  carryIds?: string[];
  /** Bilinçli olarak bırakılan görevler. */
  dropIds?: string[];
  /** Yarının en fazla üç must-do'su. */
  tomorrowMustDoIds?: string[];
  /** Tek cümlelik gün değerlendirmesi. */
  reflection?: string | null;
};

export class CloseDayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloseDayError';
  }
}

function unique(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

/**
 * Taşınan görevin saatini korur; saati yoksa yarın öğlene yerleştirir.
 * Öğlen seçilmesi DST geçişlerinde günün kaymasını engeller.
 */
function tomorrowSchedule(task: Task, tomorrowKey: string): string {
  const next = dateFromDayKey(tomorrowKey);
  const current = task.scheduledAt ? new Date(task.scheduledAt) : null;

  if (current && !Number.isNaN(current.getTime())) {
    next.setHours(current.getHours(), current.getMinutes(), 0, 0);
  }

  return next.toISOString();
}

/**
 * Günü kapatır: karar verilen görevleri yarına taşır ya da bırakır,
 * yarının üçünü seçer ve günün notunu yazar.
 *
 * Karar verilmeyen görevlere dokunulmaz: gün kapanışı bir zorunluluk
 * değil, bir temizliktir.
 */
export function closeDay(input: CloseDayInput = {}): DailyPlan {
  const dayKey = input.dayKey ?? localDayKey();
  const tomorrowKey = localDayKey(addLocalDays(dateFromDayKey(dayKey), 1));
  const carryIds = unique(input.carryIds ?? []);
  const dropIds = unique(input.dropIds ?? []);
  const mustDoIds = unique(input.tomorrowMustDoIds ?? []);

  if (mustDoIds.length > MUST_DO_LIMIT) {
    throw new CloseDayError(`Yarının en fazla ${MUST_DO_LIMIT} must-do'su olabilir.`);
  }

  const overlap = dropIds.filter((id) => carryIds.includes(id) || mustDoIds.includes(id));
  if (overlap.length > 0) {
    throw new CloseDayError('Bir görev aynı anda hem taşınamaz hem bırakılamaz.');
  }

  const db = getDb();
  const now = new Date().toISOString();
  const reflection = input.reflection?.trim() || null;

  db.transaction((tx) => {
    const ids = unique([...carryIds, ...dropIds, ...mustDoIds]);
    const rows = ids.length
      ? tx.select().from(tasks).where(inArray(tasks.id, ids)).all()
      : [];
    const byId = new Map(rows.map((row) => [row.id, row]));

    // Önce bugünün must-do'larını bırak: yarının üçü için yer açılsın.
    const openMustDos = tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.priority, 1), eq(tasks.status, 'open')))
      .all();
    const demoteIds = openMustDos
      .map((row) => row.id)
      .filter((id) => !mustDoIds.includes(id));
    if (demoteIds.length > 0) {
      tx.update(tasks).set({ priority: 0 }).where(inArray(tasks.id, demoteIds)).run();
    }

    for (const id of carryIds) {
      const task = byId.get(id);
      if (!task || task.status !== 'open') continue;

      tx.update(tasks)
        .set({ scheduledAt: tomorrowSchedule(task, tomorrowKey), priority: 0 })
        .where(eq(tasks.id, id))
        .run();
      tx.insert(taskEvents)
        .values({
          id: newId(),
          taskId: id,
          type: 'carried',
          payloadJson: JSON.stringify({ to: tomorrowKey }),
          createdAt: now,
        })
        .run();
    }

    for (const id of dropIds) {
      const task = byId.get(id);
      if (!task || task.status !== 'open') continue;

      tx.update(tasks)
        .set({ status: 'dropped', completedAt: now, priority: 0 })
        .where(eq(tasks.id, id))
        .run();
      tx.insert(taskEvents)
        .values({
          id: newId(),
          taskId: id,
          type: 'dropped',
          payloadJson: JSON.stringify({ at: dayKey }),
          createdAt: now,
        })
        .run();
    }

    for (const id of mustDoIds) {
      const task = byId.get(id);
      if (!task || task.status !== 'open') continue;

      tx.update(tasks)
        .set({ priority: 1, scheduledAt: tomorrowSchedule(task, tomorrowKey) })
        .where(eq(tasks.id, id))
        .run();
      tx.insert(taskEvents)
        .values({
          id: newId(),
          taskId: id,
          type: 'planned',
          payloadJson: JSON.stringify({ for: tomorrowKey, mustDo: true }),
          createdAt: now,
        })
        .run();
    }

    tx.insert(dailyPlans)
      .values({ date: dayKey, reflection, closedAt: now })
      .onConflictDoUpdate({
        target: dailyPlans.date,
        set: { reflection, closedAt: now },
      })
      .run();
  });

  const closed = getDayPlan(dayKey);
  if (!closed) throw new CloseDayError('Gün kapatılamadı.');
  return closed;
}
