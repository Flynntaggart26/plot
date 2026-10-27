import { and, desc, eq, isNull } from 'drizzle-orm';
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
import { normalizeTitle, searchNoteList } from './link-utils';
import type { NoteSearchResult } from './link-utils';

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

/** Giden bağlantı: hedef hâlâ var mı? */
export type OutgoingLink = {
  link: NoteLink;
  resolved: Note | null;
};

/** Bu nota işaret eden başka bir not. */
export type Backlink = {
  note: Note;
  link: NoteLink;
};

/** Arama sonucu tipi `link-utils` ile ortaktır. */
export type { NoteSearchResult };

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

  const created = getNote(id);
  if (!created) throw new Error('Not oluşturulamadı.');

  // Gövdedeki [[bağlantı]]lar kayıtla birlikte çözülür; başka notların
  // bu başlığa verdiği eski linkler de artık hedefini bulur.
  syncNoteLinks(created.id, created.bodyMd);
  resolveDanglingLinks(created.id, created.title);
  return created;
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
  const previous = getNote(id);

  const changes: Record<string, unknown> = { updatedAt: now };
  if (patch.title !== undefined) changes.title = patch.title.trim();
  if (patch.bodyMd !== undefined) changes.bodyMd = patch.bodyMd;
  if (patch.folder !== undefined) changes.folder = patch.folder;
  if (patch.isDaily !== undefined) changes.isDaily = patch.isDaily ? 1 : 0;
  if (patch.dailyDate !== undefined) changes.dailyDate = patch.dailyDate;

  db.update(notes).set(changes).where(eq(notes.id, id)).run();

  const updated = getNote(id);
  if (!updated) throw new Error('Not bulunamadı.');

  if (patch.bodyMd !== undefined || patch.title !== undefined) {
    syncNoteLinks(id, updated.bodyMd);
  }
  if (patch.title !== undefined && previous?.title !== updated.title) {
    resolveDanglingLinks(id, updated.title);
  }

  return updated;
}

export function deleteNote(id: string): void {
  getDb().delete(notes).where(eq(notes.id, id)).run();
}

/**
 * Not gövdesindeki `[[başlık]]`ları `note_links` tablosuna yazar.
 * Önce kaynağın eski satırları silinir: böylece gövdeden çıkarılan bir
 * bağlantı da tablodan düşer.
 */
export function syncNoteLinks(noteId: string, bodyMd: string): void {
  const db = getDb();

  // Normalleştirilmiş başlık → ilk yazım. Aynı başlığın farklı
  // büyük/küçük harfli tekrarları tek satıra düşer.
  const titles = new Map<string, string>();
  for (const raw of extractWikiLinks(bodyMd)) {
    const title = raw.trim().replace(/\s+/g, ' ');
    if (!title) continue;
    const key = normalizeTitle(title);
    if (!key || titles.has(key)) continue;
    titles.set(key, title);
  }

  // En son güncellenen not kazanır: listNotes zaten updatedAt'e göre azalan.
  const targets = new Map<string, string>();
  for (const note of listNotes()) {
    const key = normalizeTitle(note.title);
    if (!targets.has(key)) targets.set(key, note.id);
  }

  db.transaction((tx) => {
    tx.delete(noteLinks).where(eq(noteLinks.sourceId, noteId)).run();
    for (const [key, title] of titles) {
      tx.insert(noteLinks)
        .values({
          id: newId(),
          sourceId: noteId,
          targetTitle: title,
          resolvedId: targets.get(key) ?? null,
        })
        .run();
    }
  });
}

/**
 * Yeni oluşan ya da yeniden adlandırılan bir notun başlığını bekleyen
 * çözülmemiş linkleri bağlar. "Önce link, sonra not" akışını çalıştırır.
 */
export function resolveDanglingLinks(noteId: string, title: string): void {
  const key = normalizeTitle(title);
  if (!key) return;

  const db = getDb();
  const dangling = db.select().from(noteLinks).where(isNull(noteLinks.resolvedId)).all();

  for (const link of dangling) {
    if (normalizeTitle(link.targetTitle) !== key) continue;
    db.update(noteLinks)
      .set({ resolvedId: noteId })
      .where(eq(noteLinks.id, link.id))
      .run();
  }
}

/** Başlığa birebir (normalize edilmiş) karşılık gelen notu bulur. */
export function resolveWikiTarget(title: string): Note | null {
  const key = normalizeTitle(title);
  if (!key) return null;
  return listNotes().find((note) => normalizeTitle(note.title) === key) ?? null;
}

/** Bu nota işaret eden notlar. Kendi kendine verilen link sayılmaz. */
export function getBacklinks(noteId: string): Backlink[] {
  const db = getDb();
  const rows = db
    .select({ link: noteLinks, note: notes })
    .from(noteLinks)
    .innerJoin(notes, eq(notes.id, noteLinks.sourceId))
    .where(eq(noteLinks.resolvedId, noteId))
    .all();

  return rows
    .filter((row) => row.note.id !== noteId)
    .sort((a, b) => a.note.title.localeCompare(b.note.title, 'tr'));
}

/** Bu notun gövdesindeki bağlantılar; hedefi silinmiş olanlar `resolved: null`. */
export function getOutgoingLinks(noteId: string): OutgoingLink[] {
  const db = getDb();
  const rows = db
    .select({ link: noteLinks, note: notes })
    .from(noteLinks)
    .leftJoin(notes, eq(notes.id, noteLinks.resolvedId))
    .where(eq(noteLinks.sourceId, noteId))
    .all();

  return rows.map((row) => ({ link: row.link, resolved: row.note ?? null }));
}

/**
 * Başlık ve gövdede arama. Veri kişisel ölçekte olduğu için SQL yerine
 * bellekte çalışır: Türkçe harf katlaması ve aksan duyarsızlığı böylece
 * tek yerden yönetilir.
 */
export function searchNotes(query: string): NoteSearchResult[] {
  return searchNoteList(listNotes(), query);
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