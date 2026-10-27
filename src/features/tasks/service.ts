import { and, asc, desc, eq, gte, lt, or, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { INBOX_AREA_ID, INBOX_PROJECT_ID } from '@/db/seed';
import { areas, projects, taskEvents, tasks, type Task } from '@/db/schema';
import { dayBounds, dateFromDayKey, localDayKey } from '@/lib/date';
import { newId } from '@/lib/id';

/**
 * Görev servisi — UI'ın SQL gördüğü tek yer.
 *
 * Kurallar burada yaşar, ekranlarda değil:
 * - Başlık boş olamaz.
 * - Aynı anda en fazla 3 açık must-do olabilir.
 * - Her durum değişikliği `task_events`'e yazılır (ileride istatistik/geri alma).
 * - Silme dışında hiçbir işlem satırı yok etmez; tamamlama zaman damgası bırakır.
 */

export const MUST_DO_LIMIT = 3;

export type TaskEnergy = 'low' | 'mid' | 'high';

export type DayTasks = {
  mustDo: Task[];
  open: Task[];
  done: Task[];
};

export type CreateTaskInput = {
  title: string;
  notes?: string | null;
  estimateMin?: number | null;
  energy?: TaskEnergy | null;
  mustDo?: boolean;
  /** ISO-8601 UTC. Verilmezse şimdi. `null` bilinçli olarak tarihsiz bırakır. */
  scheduledAt?: string | null;
};

export type UpdateTaskInput = {
  title?: string;
  notes?: string | null;
  estimateMin?: number | null;
  energy?: TaskEnergy | null;
  mustDo?: boolean;
  scheduledAt?: string | null;
};

/** Kullanıcıya gösterilebilir, beklenen hata. */
export class TaskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskError';
  }
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new TaskError('Görev başlığı boş olamaz.');
  return trimmed;
}

export function countOpenMustDos(): number {
  const db = getDb();
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.priority, 1), eq(tasks.status, 'open')))
    .get();
  return row?.count ?? 0;
}

export function getTask(id: string): Task | null {
  return getDb().select().from(tasks).where(eq(tasks.id, id)).get() ?? null;
}

export function createTask(input: CreateTaskInput): Task {
  const db = getDb();
  const title = normalizeTitle(input.title);
  const mustDo = Boolean(input.mustDo);

  if (mustDo && countOpenMustDos() >= MUST_DO_LIMIT) {
    throw new TaskError(`Aynı anda en fazla ${MUST_DO_LIMIT} must-do açık olabilir.`);
  }

  const id = newId();
  const now = new Date().toISOString();

  db.transaction((tx) => {
    // Inbox her görevden önce garanti: tohumlama henüz çalışmamış olsa bile
    // yabancı anahtar boşta kalmaz.
    tx.insert(areas)
      .values({ id: INBOX_AREA_ID, name: 'Inbox', icon: 'tray-outline', sortOrder: 0 })
      .onConflictDoNothing()
      .run();
    tx.insert(projects)
      .values({
        id: INBOX_PROJECT_ID,
        areaId: INBOX_AREA_ID,
        name: 'Inbox',
        sortOrder: 0,
      })
      .onConflictDoNothing()
      .run();

    tx.insert(tasks)
      .values({
        id,
        projectId: INBOX_PROJECT_ID,
        title,
        notes: input.notes?.trim() || null,
        priority: mustDo ? 1 : 0,
        estimateMin: input.estimateMin ?? null,
        energy: input.energy ?? null,
        scheduledAt: input.scheduledAt === undefined ? now : input.scheduledAt,
        status: 'open',
        createdAt: now,
      })
      .run();

    tx.insert(taskEvents)
      .values({
        id: newId(),
        taskId: id,
        type: 'created',
        payloadJson: JSON.stringify({ mustDo }),
        createdAt: now,
      })
      .run();
  });

  const created = getTask(id);
  if (!created) throw new TaskError('Görev kaydedilemedi.');
  return created;
}

export function updateTask(id: string, patch: UpdateTaskInput): Task {
  const db = getDb();
  const current = getTask(id);
  if (!current) throw new TaskError('Görev bulunamadı.');

  const changes: Partial<typeof tasks.$inferInsert> = {};
  const changed: string[] = [];

  if (patch.title !== undefined) {
    const title = normalizeTitle(patch.title);
    if (title !== current.title) {
      changes.title = title;
      changed.push('title');
    }
  }

  if (patch.notes !== undefined) {
    const notes = patch.notes?.trim() || null;
    if (notes !== current.notes) {
      changes.notes = notes;
      changed.push('notes');
    }
  }

  if (patch.estimateMin !== undefined && patch.estimateMin !== current.estimateMin) {
    changes.estimateMin = patch.estimateMin;
    changed.push('estimateMin');
  }

  if (patch.energy !== undefined && patch.energy !== current.energy) {
    changes.energy = patch.energy;
    changed.push('energy');
  }

  if (patch.scheduledAt !== undefined && patch.scheduledAt !== current.scheduledAt) {
    changes.scheduledAt = patch.scheduledAt;
    changed.push('scheduledAt');
  }

  if (patch.mustDo !== undefined) {
    const nextPriority = patch.mustDo ? 1 : 0;
    if (nextPriority !== current.priority) {
      if (
        nextPriority === 1 &&
        current.status === 'open' &&
        countOpenMustDos() >= MUST_DO_LIMIT
      ) {
        throw new TaskError(`Aynı anda en fazla ${MUST_DO_LIMIT} must-do açık olabilir.`);
      }
      changes.priority = nextPriority;
      changed.push('mustDo');
    }
  }

  if (changed.length === 0) return current;

  db.transaction((tx) => {
    tx.update(tasks).set(changes).where(eq(tasks.id, id)).run();
    tx.insert(taskEvents)
      .values({
        id: newId(),
        taskId: id,
        type: 'updated',
        payloadJson: JSON.stringify({ fields: changed }),
        createdAt: new Date().toISOString(),
      })
      .run();
  });

  const updated = getTask(id);
  if (!updated) throw new TaskError('Görev bulunamadı.');
  return updated;
}

export function completeTask(id: string): Task {
  const db = getDb();
  const current = getTask(id);
  if (!current) throw new TaskError('Görev bulunamadı.');
  if (current.status === 'done') return current;

  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(tasks)
      .set({ status: 'done', completedAt: now })
      .where(eq(tasks.id, id))
      .run();
    tx.insert(taskEvents)
      .values({
        id: newId(),
        taskId: id,
        type: 'completed',
        payloadJson: null,
        createdAt: now,
      })
      .run();
  });

  const updated = getTask(id);
  if (!updated) throw new TaskError('Görev bulunamadı.');
  return updated;
}

/**
 * Tamamlanan görevi geri açar. Must-do sınırı bu sırada doluysa görev
 * sessizce normal göreve düşer: geri alma asla engellenmez, ama sınır aşılmaz.
 */
export function reopenTask(id: string): Task {
  const db = getDb();
  const current = getTask(id);
  if (!current) throw new TaskError('Görev bulunamadı.');
  if (current.status === 'open') return current;

  const now = new Date().toISOString();
  const demoted = current.priority === 1 && countOpenMustDos() >= MUST_DO_LIMIT;

  db.transaction((tx) => {
    tx.update(tasks)
      .set({
        status: 'open',
        completedAt: null,
        priority: demoted ? 0 : current.priority,
      })
      .where(eq(tasks.id, id))
      .run();
    tx.insert(taskEvents)
      .values({
        id: newId(),
        taskId: id,
        type: 'reopened',
        payloadJson: JSON.stringify({ demotedFromMustDo: demoted }),
        createdAt: now,
      })
      .run();
  });

  const updated = getTask(id);
  if (!updated) throw new TaskError('Görev bulunamadı.');
  return updated;
}

export function deleteTask(id: string): void {
  getDb().delete(tasks).where(eq(tasks.id, id)).run();
}

/** Bugünün görevleri: bugüne planlananlar + açık must-do'lar + bugün tamamlananlar. */
export function listDayTasks(dayKey: string = localDayKey()): DayTasks {
  const db = getDb();
  const bounds = dayBounds(dateFromDayKey(dayKey));

  const rows = db
    .select()
    .from(tasks)
    .where(
      or(
        and(gte(tasks.scheduledAt, bounds.start), lt(tasks.scheduledAt, bounds.end)),
        and(eq(tasks.priority, 1), eq(tasks.status, 'open')),
        and(gte(tasks.completedAt, bounds.start), lt(tasks.completedAt, bounds.end)),
      ),
    )
    .orderBy(desc(tasks.priority), asc(tasks.sortOrder), asc(tasks.createdAt))
    .all();

  const mustDo = rows.filter((task) => task.status === 'open' && task.priority === 1);
  const open = rows.filter((task) => task.status === 'open' && task.priority !== 1);
  const done = rows
    .filter((task) => task.status === 'done' || task.status === 'dropped')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  return { mustDo, open, done };
}

/**
 * Tüm açık görevler. Plan ekranındaki kaynak panel, görünür haftanın
 * dışında kalan görevleri buradan süzer; böylece planlaması kaldırılan
 * bir görev de panelde yeniden görünür.
 */
export function listOpenTasks(): Task[] {
  return getDb()
    .select()
    .from(tasks)
    .where(eq(tasks.status, 'open'))
    .orderBy(desc(tasks.priority), asc(tasks.sortOrder), asc(tasks.createdAt))
    .all();
}
