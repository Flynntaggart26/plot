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

const IDEA_STATUS_LABELS: Record<string, string> = {
  spark: 'Kıvılcım',
  saved: 'Kaydedildi',
  committed: 'Taahhüt',
  archived: 'Arşiv',
};

const TASK_ENERGY_LABELS: Record<string, string> = {
  low: 'düşük',
  mid: 'orta',
  high: 'yüksek',
};

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** ISO damgasını okunabilir yerel tarihe çevirir; bozuksa ham değeri bırakır. */
function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function formatTaskLine(task: BackupData['tasks'][number], done: boolean): string[] {
  const meta: string[] = [];
  if (task.priority === 1) meta.push('must-do');
  if (task.estimateMin) meta.push(`tahmini ${task.estimateMin} dk`);
  if (task.energy) meta.push(`enerji ${TASK_ENERGY_LABELS[task.energy] ?? task.energy}`);
  if (task.scheduledAt) meta.push(`planlandı ${formatDateTime(task.scheduledAt)}`);
  if (done && task.completedAt) meta.push(`bitti ${formatDateTime(task.completedAt)}`);
  if (task.status === 'carried') meta.push('ertelendi');
  if (task.status === 'dropped') meta.push('bırakıldı');

  const lines = [`- [${done ? 'x' : ' '}] ${task.title}`];
  if (meta.length > 0) lines.push(`  - ${meta.join(' · ')}`);
  if (task.notes) lines.push(`  - Not: ${task.notes.replace(/\s*\n\s*/g, ' / ')}`);
  return lines;
}

/**
 * İnsan okunabilir Markdown yedeği.
 *
 * Amaç JSON'un yerini almak değil: kullanıcı dosyayı bir metin düzenleyicide
 * açtığında neyin nerede olduğunu anlasın. Bu yüzden en üstte kısa bir özet,
 * ardından durum bazlı bölümler var. Bölümler boşsa başlık yine yazılır;
 * "veri yok" ile "bölüm unutulmuş" birbirine karışmaz.
 */
export function exportToMarkdown(data: BackupData): string {
  const lines: string[] = [];
  const push = (...items: string[]) => lines.push(...items);

  const openTasks = data.tasks.filter((task) => task.status !== 'done');
  const doneTasks = data.tasks.filter((task) => task.status === 'done');
  const totalFocusMinutes = data.focusSessions.reduce(
    (sum, session) => sum + (session.actualMin ?? session.plannedMin ?? 0),
    0,
  );
  const ideaCounts = data.ideas.reduce<Record<string, number>>((counts, idea) => {
    counts[idea.status] = (counts[idea.status] ?? 0) + 1;
    return counts;
  }, {});

  push(
    '# Plot Veri Yedeği',
    '',
    `Oluşturulma: ${formatDateTime(data.exportedAt)}`,
    `Şema sürümü: ${data.schemaVersion}`,
    '',
    '# Özet',
    '',
    `- Görevler: ${openTasks.length} açık · ${doneTasks.length} tamamlanan`,
    `- Notlar: ${data.notes.length}`,
    `- Fikirler: ${data.ideas.length} (${
      (['spark', 'saved', 'committed', 'archived'] as const)
        .map((status) => `${ideaCounts[status] ?? 0} ${IDEA_STATUS_LABELS[status].toLowerCase()}`)
        .join(' · ')
    })`,
    `- Odak: ${data.focusSessions.length} blok · ${totalFocusMinutes} dk`,
    `- Günlük plan: ${data.dailyPlans.length}`,
    '',
  );

  push('# Açık Görevler', '');
  if (openTasks.length === 0) {
    push('_Açık görev yok._');
  } else {
    for (const task of openTasks) push(...formatTaskLine(task, false));
  }
  push('');

  push('# Tamamlanan Görevler', '');
  if (doneTasks.length === 0) {
    push('_Henüz tamamlanan görev yok._');
  } else {
    for (const task of doneTasks) push(...formatTaskLine(task, true));
  }
  push('');

  push('# Notlar', '');
  if (data.notes.length === 0) {
    push('_Not yok._');
  } else {
    for (const note of data.notes) {
      push(`### ${note.title}`, '');
      push(note.bodyMd?.trim() ? note.bodyMd.trim() : '_Boş not._', '');
    }
  }
  push('');

  push('# Fikirler', '');
  if (data.ideas.length === 0) {
    push('_Fikir yok._');
  } else {
    for (const idea of data.ideas) {
      push(`### ${idea.title}`, '');
      push(`Durum: ${IDEA_STATUS_LABELS[idea.status] ?? idea.status}`);
      if (idea.body?.trim()) push('', idea.body.trim());
      if (idea.firstStep?.trim()) push('', `İlk adım: ${idea.firstStep.trim()}`);
      push('');
    }
  }

  push('');

  push('# Odak Blokları', '');
  if (data.focusSessions.length === 0) {
    push('_Odak oturumu yok._');
  } else {
    const ordered = [...data.focusSessions].sort((a, b) =>
      a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0,
    );
    for (const session of ordered) {
      const planned = session.plannedMin ? `${session.plannedMin} dk plan` : 'süre belirtilmemiş';
      const actual = session.actualMin ? `${session.actualMin} dk gerçek` : 'süre kaydedilmemiş';
      push(`- ${formatDateTime(session.startedAt)} · ${planned} · ${actual}`);
    }
  }
  push('');

  push('# Günlük Planlar', '');
  if (data.dailyPlans.length === 0) {
    push('_Günlük plan yok._');
  } else {
    const ordered = [...data.dailyPlans].sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const plan of ordered) {
      const energy = plan.energy ? `enerji ${plan.energy}/5` : 'enerji —';
      const intention = plan.intention?.trim() ? plan.intention.trim() : 'niyet —';
      push(`- ${plan.date} · ${energy} · ${intention}`);
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

const BACKUP_ARRAY_KEYS = [
  'areas',
  'projects',
  'tasks',
  'taskEvents',
  'focusSessions',
  'notes',
  'noteLinks',
  'noteTags',
  'tags',
  'ideas',
  'dailyPlans',
  'chatThreads',
  'chatMessages',
  'aiRuns',
  'settings',
] as const;

/**
 * Kullanıcının seçtiği dosyanın içeriğini yedeğe çevirir.
 *
 * Ayrıştırma ile doğrulama aynı yerde: ekran yalnızca hatayı gösterir,
 * yarım kalmış bir yedeğin veritabanına dokunmasına izin verilmez.
 */
export function parseBackupText(text: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Dosya geçerli bir JSON yedeği değil.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Yedek dosyası tanınmadı.');
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate.schemaVersion !== '1') {
    throw new Error('Desteklenmeyen yedek sürümü.');
  }

  for (const key of BACKUP_ARRAY_KEYS) {
    if (!Array.isArray(candidate[key])) {
      throw new Error(`Yedek bozuk: "${key}" dizisi eksik.`);
    }
  }

  return candidate as BackupData;
}

export function importAllData(data: BackupData): void {
  if (data.schemaVersion !== '1') {
    throw new Error('Desteklenmeyen yedek sürümü.');
  }
  for (const key of BACKUP_ARRAY_KEYS) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Yedek bozuk: "${key}" dizisi eksik.`);
    }
  }

  const sqlite = getSqlite();
  sqlite.execSync('BEGIN TRANSACTION;');

  try {
    // Önce mevcut verileri temizle (bağımlı sırayla)
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