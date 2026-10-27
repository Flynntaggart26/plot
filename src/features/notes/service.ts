import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  noteLinks,
  noteTags,
  notes,
  tags,
  type Note,
  type NoteLink,
} from '@/db/schema';
import { localDayKey } from '@/lib/date';
import { newId } from '@/lib/id';

export type NoteFolder = 'inbox' | 'daily' | string | null;
export type { Note };

export type CreateNoteInput = {
  title: string;
  bodyMd?: string;
  folder?: NoteFolder;
  isDaily?: boolean;
  dailyDate?: string | null;
};

export type UpdateNoteInput = {
  title?: string;
  bodyMd?: string;
  folder?: NoteFolder;
  isDaily?: boolean;
  dailyDate?: string | null;
};

/**
 * Not servisi — tam CRUD + bağlantı (backlink) yönetimi.
 * Tüm işlemler SQLite'da senkron çalışır.
 */

export function createNote(input: CreateNoteInput): Note {
  const db = getDb();
  const id = newId();
  const now = new Date().toISOString();
  const dailyDate = input.isDaily ? input.dailyDate ?? localDayKey() : null;

  db.insert(notes)
    .values({
      id,
      title: input.title.trim(),
      bodyMd: input.bodyMd ?? '',
      folder: input.folder ?? null,
      isDaily: input.isDaily ? 1 : 0,
      dailyDate,
      updatedAt: now,
    })
    .run();

  return getNote(id)!;
}

export function getNote(id: string): Note | null {
  return getDb().select().from(notes).where(eq(notes.id, id)).get() ?? null;
}

export function listNotes(folder?: NoteFolder): Note[] {
  const db = getDb();
  const query = db.select().from(notes).orderBy(desc(notes.updatedAt));

  if (folder === 'daily') {
    return query.where(eq(notes.isDaily, 1)).all();
  }
  if (folder) {
    return query.where(eq(notes.folder, folder)).all();
  }
  return query.all();
}

export function getDailyNote(dayKey: string = localDayKey()): Note | null {
  const db = getDb();
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.isDaily, 1), eq(notes.dailyDate, dayKey)))
    .get() ?? null;
}

export function updateNote(id: string, patch: UpdateNoteInput): Note {
  const db = getDb();
  const now = new Date().toISOString();

  const changes: Record<string, unknown> = { updatedAt: now };
  if (patch.title !== undefined) changes.title = patch.title.trim();
  if (patch.bodyMd !== undefined) changes.bodyMd = patch.bodyMd;
  if (patch.folder !== undefined) changes.folder = patch.folder;
  if (patch.isDaily !== undefined) changes.isDaily = patch.isDaily ? 1 : 0;
  if (patch.dailyDate !== undefined) changes.dailyDate = patch.dailyDate;

  db.update(notes).set(changes).where(eq(notes.id, id)).run();

  const updated = getNote(id);
  if (!updated) throw new Error('Not bulunamadı.');
  return updated;
}

export function deleteNote(id: string): void {
  getDb().delete(notes).where(eq(notes.id, id)).run();
}

/** İki not arasında çift yönlü bağlantı oluştur. */
export function createNoteLink(
  sourceId: string,
  targetTitle: string,
  resolvedId: string | null = null,
): NoteLink {
  const db = getDb();
  const id = newId();
  db.insert(noteLinks)
    .values({ id, sourceId, targetTitle, resolvedId })
    .run();
  return { id, sourceId, targetTitle, resolvedId };
}

/** Bir notun içinde geçen [[bağlantı]]ları getir. */
export function getNoteLinks(noteId: string): NoteLink[] {
  const db = getDb();
  return db.select().from(noteLinks).where(eq(noteLinks.sourceId, noteId)).all();
}

/** Etiket ekle / çıkar */
export function toggleNoteTag(noteId: string, tagName: string): void {
  const db = getDb();
  const tag = db.select().from(tags).where(eq(tags.name, tagName)).get();
  const tagId = tag?.id ?? newId();

  if (!tag) {
    db.insert(tags).values({ id: tagId, name: tagName }).run();
  }

  const existing = db
    .select()
    .from(noteTags)
    .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)))
    .get();

  if (existing) {
    db.delete(noteTags)
      .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)))
      .run();
  } else {
    db.insert(noteTags).values({ noteId, tagId }).run();
  }
}

/** Etikete göre notları filtrele. */
export function listNotesByTag(tagName: string): Note[] {
  const db = getDb();
  const rows = db
    .select()
    .from(notes)
    .innerJoin(noteTags, eq(notes.id, noteTags.noteId))
    .innerJoin(tags, eq(tags.id, noteTags.tagId))
    .where(eq(tags.name, tagName))
    .orderBy(desc(notes.updatedAt))
    .all();
  return rows.map((row) => row.notes) as Note[];
}

/** Not içindeki [[başlık]] kalıplarını çıkarır. */
export function extractWikiLinks(bodyMd: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(bodyMd)) !== null) {
    links.push(match[1].trim());
  }
  return links;
}