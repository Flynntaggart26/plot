import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { focusSessions, type FocusSession } from '@/db/schema';
import { dayBounds, localDayKey } from '@/lib/date';
import { newId } from '@/lib/id';

export type CreateFocusSessionInput = {
  taskId?: string | null;
  plannedMin: number;
  mood?: string | null;
};

export type UpdateFocusSessionInput = {
  actualMin?: number;
  interruptions?: number;
  mood?: string | null;
  endedAt?: string | null;
};

/**
 * Odak oturumu servisi — Pomodoro sonuçlarını veritabanında saklar.
 * focus_sessions tablosu zaten schema'da tanımlı.
 */

export function createFocusSession(input: CreateFocusSessionInput): FocusSession {
  const db = getDb();
  const id = newId();
  const now = new Date().toISOString();

  db.insert(focusSessions)
    .values({
      id,
      taskId: input.taskId ?? null,
      plannedMin: input.plannedMin,
      actualMin: null,
      interruptions: 0,
      mood: input.mood ?? null,
      startedAt: now,
      endedAt: null,
    })
    .run();

  return getFocusSession(id)!;
}

export function getFocusSession(id: string): FocusSession | null {
  return getDb()
    .select()
    .from(focusSessions)
    .where(eq(focusSessions.id, id))
    .get() ?? null;
}

export function listFocusSessions(limit = 50): FocusSession[] {
  const db = getDb();
  return db
    .select()
    .from(focusSessions)
    .orderBy(desc(focusSessions.startedAt))
    .limit(limit)
    .all();
}

export function getTodayFocusSessions(dayKey: string = localDayKey()): FocusSession[] {
  const db = getDb();
  const { start, end } = dayBounds(new Date(`${dayKey}T12:00:00`));
  return db
    .select()
    .from(focusSessions)
    .where(and(gte(focusSessions.startedAt, start), lt(focusSessions.startedAt, end)))
    .orderBy(desc(focusSessions.startedAt))
    .all();
}

export function endFocusSession(
  id: string,
  patch: UpdateFocusSessionInput,
): FocusSession {
  const db = getDb();
  const changes: Record<string, unknown> = {};

  if (patch.actualMin !== undefined) changes.actualMin = patch.actualMin;
  if (patch.interruptions !== undefined) changes.interruptions = patch.interruptions;
  if (patch.mood !== undefined) changes.mood = patch.mood;
  if (patch.endedAt !== undefined) changes.endedAt = patch.endedAt;

  if (Object.keys(changes).length === 0) {
    return getFocusSession(id)!;
  }

  db.update(focusSessions).set(changes).where(eq(focusSessions.id, id)).run();

  const updated = getFocusSession(id);
  if (!updated) throw new Error('Oturum bulunamadı.');
  return updated;
}

export function linkTaskToSession(sessionId: string, taskId: string): void {
  const db = getDb();
  db.update(focusSessions)
    .set({ taskId })
    .where(eq(focusSessions.id, sessionId))
    .run();
}

export function getFocusStats() {
  const db = getDb();
  const rows = db.select().from(focusSessions).all();

  const totalSessions = rows.length;
  const completedSessions = rows.filter((r) => r.endedAt !== null).length;
  const totalPlannedMin = rows.reduce((sum, r) => sum + (r.plannedMin ?? 0), 0);
  const totalActualMin = rows.reduce(
    (sum, r) => sum + (r.actualMin ?? 0),
    0,
  );
  const totalInterruptions = rows.reduce(
    (sum, r) => sum + (r.interruptions ?? 0),
    0,
  );

  return {
    totalSessions,
    completedSessions,
    totalPlannedMin,
    totalActualMin,
    totalInterruptions,
    completionRate:
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0,
  };
}