import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

/**
 * Plot veri modeli — tek doğruluk kaynağı.
 *
 * Kurallar:
 * - Tüm kimlikler TEXT (UUID).
 * - Tüm zamanlar ISO-8601 UTC string; yerel gösterim cihaz saat diliminde.
 * - Süreler dakika (integer). Para yok.
 * - `daily_plans.date` yerel gün anahtarıdır (`YYYY-MM-DD`), UTC değil.
 * - CHECK kısıtları plan §8'deki değer kümelerini veritabanında da zorlar.
 */

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const areas = sqliteTable('areas', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color'),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(now),
});

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    areaId: text('area_id').references(() => areas.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    color: text('color'),
    archived: integer('archived').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull().default(now),
  },
  (table) => [index('projects_area_idx').on(table.areaId)],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    parentId: text('parent_id').references((): AnySQLiteColumn => tasks.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    notes: text('notes'),
    status: text('status', { enum: ['open', 'done', 'carried', 'dropped'] })
      .notNull()
      .default('open'),
    /** 1 = must-do. Aynı anda en fazla 3 açık must-do (servis katmanı zorlar). */
    priority: integer('priority').notNull().default(0),
    estimateMin: integer('estimate_min'),
    actualMin: integer('actual_min'),
    dueAt: text('due_at'),
    /** Gün içi planlama: görevin yerleştirildiği an (ISO UTC). */
    scheduledAt: text('scheduled_at'),
    energy: text('energy', { enum: ['low', 'mid', 'high'] }),
    sortOrder: integer('sort_order').notNull().default(0),
    recurringRule: text('recurring_rule'),
    createdAt: text('created_at').notNull().default(now),
    completedAt: text('completed_at'),
  },
  (table) => [
    index('tasks_status_scheduled_idx').on(table.status, table.scheduledAt),
    index('tasks_project_idx').on(table.projectId),
    index('tasks_created_idx').on(table.createdAt),
    check('tasks_status_check', sql`${table.status} in ('open','done','carried','dropped')`),
    check('tasks_energy_check', sql`${table.energy} in ('low','mid','high')`),
    check('tasks_priority_check', sql`${table.priority} in (0, 1)`),
  ],
);

export const taskEvents = sqliteTable(
  'task_events',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payloadJson: text('payload_json'),
    createdAt: text('created_at').notNull().default(now),
  },
  (table) => [index('task_events_task_idx').on(table.taskId, table.createdAt)],
);

export const focusSessions = sqliteTable(
  'focus_sessions',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    plannedMin: integer('planned_min'),
    actualMin: integer('actual_min'),
    interruptions: integer('interruptions').notNull().default(0),
    mood: text('mood'),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
  },
  (table) => [index('focus_sessions_started_idx').on(table.startedAt)],
);

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    bodyMd: text('body_md').notNull().default(''),
    folder: text('folder'),
    isDaily: integer('is_daily').notNull().default(0),
    dailyDate: text('daily_date'),
    contentHash: text('content_hash'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (table) => [
    index('notes_updated_idx').on(table.updatedAt),
    index('notes_daily_idx').on(table.isDaily, table.dailyDate),
  ],
);

export const noteLinks = sqliteTable(
  'note_links',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    /** Başlık her zaman saklanır; hedef not silinse bile link kaybolmaz. */
    targetTitle: text('target_title').notNull(),
    resolvedId: text('resolved_id').references(() => notes.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('note_links_resolved_idx').on(table.resolvedId),
    index('note_links_source_idx').on(table.sourceId),
  ],
);

export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
  },
  (table) => [uniqueIndex('tags_name_unique').on(table.name)],
);

export const noteTags = sqliteTable(
  'note_tags',
  {
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.noteId, table.tagId] })],
);

export const ideas = sqliteTable(
  'ideas',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    body: text('body'),
    firstStep: text('first_step'),
    constraintsJson: text('constraints_json'),
    score: real('score'),
    status: text('status', { enum: ['spark', 'saved', 'committed', 'archived'] })
      .notNull()
      .default('spark'),
    source: text('source'),
    createdAt: text('created_at').notNull().default(now),
  },
  (table) => [
    index('ideas_status_idx').on(table.status),
    check(
      'ideas_status_check',
      sql`${table.status} in ('spark','saved','committed','archived')`,
    ),
  ],
);

export const dailyPlans = sqliteTable(
  'daily_plans',
  {
    /** Yerel gün anahtarı: YYYY-MM-DD */
    date: text('date').primaryKey(),
    /** 1–5 arası öznel enerji. */
    energy: integer('energy'),
    intention: text('intention'),
    capacityMin: integer('capacity_min'),
    aiSummary: text('ai_summary'),
  },
  (table) => [check('daily_plans_energy_check', sql`${table.energy} between 1 and 5`)],
);

export const chatThreads = sqliteTable('chat_threads', {
  id: text('id').primaryKey(),
  title: text('title'),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
});

export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: text('id').primaryKey(),
    threadId: text('thread_id')
      .notNull()
      .references(() => chatThreads.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
    content: text('content').notNull(),
    model: text('model'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    costEst: real('cost_est'),
    createdAt: text('created_at').notNull().default(now),
  },
  (table) => [
    index('chat_messages_thread_idx').on(table.threadId, table.createdAt),
    check('chat_messages_role_check', sql`${table.role} in ('user','assistant','system')`),
  ],
);

export const aiRuns = sqliteTable(
  'ai_runs',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    purpose: text('purpose').notNull(),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    costEst: real('cost_est'),
    latencyMs: integer('latency_ms'),
    status: text('status').notNull(),
    createdAt: text('created_at').notNull().default(now),
  },
  (table) => [index('ai_runs_created_idx').on(table.createdAt)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

// ─── Tipler ──────────────────────────────────────────────────────────────────

export type Area = typeof areas.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type NoteLink = typeof noteLinks.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type DailyPlan = typeof dailyPlans.$inferSelect;
export type ChatThread = typeof chatThreads.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
