import { getDb, getSqlite } from '@/db/client';
import * as schema from '@/db/schema';

/**
 * Veri yedekleme / geri yükleme servisi.
 * Tüm tablo içeriğini JSON olarak dışarı aktarır ve geri yükler.
 * .md formatında okunabilir özet de üretir.
 */

export type BackupData = {
  schemaVersion: string;
  exportedAt: string;
  areas: typeof schema.areas.$inferSelect[];
  projects: typeof schema.projects.$inferSelect[];
  tasks: typeof schema.tasks.$inferSelect[];
  taskEvents: typeof schema.taskEvents.$inferSelect[];
  focusSessions: typeof schema.focusSessions.$inferSelect[];
  notes: typeof schema.notes.$inferSelect[];
  noteLinks: typeof schema.noteLinks.$inferSelect[];
  noteTags: typeof schema.noteTags.$inferSelect[];
  tags: typeof schema.tags.$inferSelect[];
  ideas: typeof schema.ideas.$inferSelect[];
  dailyPlans: typeof schema.dailyPlans.$inferSelect[];
  chatThreads: typeof schema.chatThreads.$inferSelect[];
  chatMessages: typeof schema.chatMessages.$inferSelect[];
  aiRuns: typeof schema.aiRuns.$inferSelect[];
  settings: typeof schema.settings.$inferSelect[];
};

export function exportAllData(): BackupData {
  const db = getDb();
  return {
    schemaVersion: '1',
    exportedAt: new Date().toISOString(),
    areas: db.select().from(schema.areas).all(),
    projects: db.select().from(schema.projects).all(),
    tasks: db.select().from(schema.tasks).all(),
    taskEvents: db.select().from(schema.taskEvents).all(),
    focusSessions: db.select().from(schema.focusSessions).all(),
    notes: db.select().from(schema.notes).all(),
    noteLinks: db.select().from(schema.noteLinks).all(),
    noteTags: db.select().from(schema.noteTags).all(),
    tags: db.select().from(schema.tags).all(),
    ideas: db.select().from(schema.ideas).all(),
    dailyPlans: db.select().from(schema.dailyPlans).all(),
    chatThreads: db.select().from(schema.chatThreads).all(),
    chatMessages: db.select().from(schema.chatMessages).all(),
    aiRuns: db.select().from(schema.aiRuns).all(),
    settings: db.select().from(schema.settings).all(),
  };
}

export function exportToMarkdown(data: BackupData): string {
  const lines: string[] = [];
  lines.push('# Plot Veri Yedeği');
  lines.push(`Oluşturulma: ${data.exportedAt}`);
  lines.push(`Şema Versiyon: ${data.schemaVersion}`);
  lines.push('');

  lines.push('## Görevler');
  for (const task of data.tasks) {
    lines.push(`- [${task.status === 'done' ? 'x' : ' '}] ${task.title}`);
    if (task.notes) lines.push(`  - Not: ${task.notes}`);
    if (task.priority === 1) lines.push(`  - 🌟 Must-do`);
  }

  lines.push('');
  lines.push('## Notlar');
  for (const note of data.notes) {
    lines.push(`### ${note.title}`);
    lines.push(note.bodyMd || '');
    lines.push('');
  }

  lines.push('## Odak Oturumları');
  for (const session of data.focusSessions) {
    lines.push(
      `- ${session.startedAt}: ${session.plannedMin}dk planlanan, ${session.actualMin}dk gerçek, ${session.interruptions} arama`,
    );
  }

  lines.push('');
  lines.push('## Günlük Planlar');
  for (const plan of data.dailyPlans) {
    lines.push(`- ${plan.date}: Enerji ${plan.energy ?? '—'}, Niyet: ${plan.intention ?? '—'}`);
  }

  return lines.join('\n');
}

export function importAllData(data: BackupData): void {
  if (data.schemaVersion !== '1') {
    throw new Error('Desteklenmeyen yedek sürümü.');
  }
  const arrays: (keyof BackupData)[] = ['areas', 'projects', 'tasks', 'taskEvents', 'focusSessions', 'notes', 'noteLinks', 'noteTags', 'tags', 'ideas', 'dailyPlans', 'chatThreads', 'chatMessages', 'aiRuns', 'settings'];
  for (const key of arrays) {
    if (!Array.isArray((data as Record<string, unknown>)[key])) {
      throw new Error(`Yedek bozuk: "${key}" dizisi eksik.`);
    }
  }

  const sqlite = getSqlite();
  sqlite.execSync('BEGIN TRANSACTION;');

  try {
    // Önce mevcut verileri temizle (abhängi sırayla)
    sqlite.execSync('DELETE FROM note_tags;');
    sqlite.execSync('DELETE FROM note_links;');
    sqlite.execSync('DELETE FROM chat_messages;');
    sqlite.execSync('DELETE FROM chat_threads;');
    sqlite.execSync('DELETE FROM ai_runs;');
    sqlite.execSync('DELETE FROM focus_sessions;');
    sqlite.execSync('DELETE FROM task_events;');
    sqlite.execSync('DELETE FROM tasks;');
    sqlite.execSync('DELETE FROM notes;');
    sqlite.execSync('DELETE FROM tags;');
    sqlite.execSync('DELETE FROM ideas;');
    sqlite.execSync('DELETE FROM daily_plans;');
    sqlite.execSync('DELETE FROM projects;');
    sqlite.execSync('DELETE FROM areas;');
    sqlite.execSync('DELETE FROM settings;');

    const db = getDb();

    // Tek tek yeniden ekle
    for (const area of data.areas) {
      db.insert(schema.areas).values(area).run();
    }
    for (const project of data.projects) {
      db.insert(schema.projects).values(project).run();
    }
    for (const tag of data.tags) {
      db.insert(schema.tags).values(tag).run();
    }
    for (const task of data.tasks) {
      db.insert(schema.tasks).values(task).run();
    }
    for (const note of data.notes) {
      db.insert(schema.notes).values(note).run();
    }
    for (const idea of data.ideas ?? []) {
      db.insert(schema.ideas).values(idea).run();
    }
    for (const plan of data.dailyPlans) {
      db.insert(schema.dailyPlans).values(plan).run();
    }
    for (const thread of data.chatThreads) {
      db.insert(schema.chatThreads).values(thread).run();
    }
    for (const message of data.chatMessages) {
      db.insert(schema.chatMessages).values(message).run();
    }
    for (const run of data.aiRuns) {
      db.insert(schema.aiRuns).values(run).run();
    }
    for (const setting of data.settings) {
      db.insert(schema.settings).values(setting).run();
    }
    for (const event of data.taskEvents) {
      db.insert(schema.taskEvents).values(event).run();
    }
    for (const session of data.focusSessions) {
      db.insert(schema.focusSessions).values(session).run();
    }
    for (const link of data.noteLinks) {
      db.insert(schema.noteLinks).values(link).run();
    }
    for (const nt of data.noteTags) {
      db.insert(schema.noteTags).values(nt).run();
    }

    sqlite.execSync('COMMIT;');
  } catch (error) {
    sqlite.execSync('ROLLBACK;');
    throw error;
  }
}