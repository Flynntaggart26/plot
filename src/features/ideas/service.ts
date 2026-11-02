import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { ideas, type Idea } from '@/db/schema';
import { newId } from '@/lib/id';
import { removeRecordingFile } from '@/features/audio/recording';

/**
 * Fikir (Tangent) servisi.
 *
 * Bir fikir yakalandığında "kıvılcım" olarak başlar; kullanıcı isterse
 * kaydeder, taahhüt eder veya arşivler. Hiçbir fikir zorla olgunlaşmaz:
 * kıvılcım olarak kalmak da geçerli bir durumdur.
 */

export type IdeaStatus = 'spark' | 'saved' | 'committed' | 'archived';
export type { Idea };

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  spark: 'Kıvılcım',
  saved: 'Kaydedildi',
  committed: 'Taahhüt',
  archived: 'Arşiv',
};

export type CreateIdeaInput = {
  title: string;
  body?: string | null;
  firstStep?: string | null;
  status?: IdeaStatus;
  source?: string | null;
  /** Sesli fikir kaydı; dosya yolu ya da web'de data URI. */
  audioPath?: string | null;
};

export type UpdateIdeaInput = {
  title?: string;
  body?: string | null;
  firstStep?: string | null;
  status?: IdeaStatus;
  audioPath?: string | null;
};

export class IdeaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdeaError';
  }
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new IdeaError('Fikir başlığı boş olamaz.');
  return trimmed;
}

function optionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

export function createIdea(input: CreateIdeaInput): Idea {
  const id = newId();
  const now = new Date().toISOString();

  getDb()
    .insert(ideas)
    .values({
      id,
      title: normalizeTitle(input.title),
      body: optionalText(input.body),
      firstStep: optionalText(input.firstStep),
      status: input.status ?? 'spark',
      source: input.source ?? 'quick-capture',
      audioPath: input.audioPath ?? null,
      createdAt: now,
    })
    .run();

  const created = getIdea(id);
  if (!created) throw new IdeaError('Fikir kaydedilemedi.');
  return created;
}

export function getIdea(id: string): Idea | null {
  return getDb().select().from(ideas).where(eq(ideas.id, id)).get() ?? null;
}

export function listIdeas(status?: IdeaStatus): Idea[] {
  const db = getDb();
  const query = db.select().from(ideas).orderBy(desc(ideas.createdAt));
  return status ? query.where(eq(ideas.status, status)).all() : query.all();
}

export function updateIdea(id: string, patch: UpdateIdeaInput): Idea {
  const current = getIdea(id);
  if (!current) throw new IdeaError('Fikir bulunamadı.');

  const changes: Partial<typeof ideas.$inferInsert> = {};

  if (patch.title !== undefined) changes.title = normalizeTitle(patch.title);
  if (patch.body !== undefined) changes.body = optionalText(patch.body);
  if (patch.firstStep !== undefined) changes.firstStep = optionalText(patch.firstStep);
  if (patch.status !== undefined) changes.status = patch.status;
  if (patch.audioPath !== undefined && patch.audioPath !== current.audioPath) {
    changes.audioPath = patch.audioPath;
  }

  if (Object.keys(changes).length === 0) return current;

  getDb().update(ideas).set(changes).where(eq(ideas.id, id)).run();

  const updated = getIdea(id);
  if (!updated) throw new IdeaError('Fikir bulunamadı.');
  return updated;
}

export async function deleteIdea(id: string): Promise<void> {
  const current = getIdea(id);
  if (!current) return;

  // Sesli fikir kaydı veritabanından önce silinir; dosya ortada kalmaz.
  if (current.audioPath) await removeRecordingFile(current.audioPath);

  getDb().delete(ideas).where(eq(ideas.id, id)).run();
}
