import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  chatMessages,
  chatThreads,
  type ChatMessage,
  type ChatThread,
} from '@/db/schema';
import { newId } from '@/lib/id';

export type CreateThreadInput = {
  title?: string | null;
};

export type CreateMessageInput = {
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  costEst?: number | null;
};

/**
 * Muse AI asistan servisi — sohbet geçmişini yerel SQLite'da tutar.
 * Gerçek LLM çağrısı eklenmeden önce mock yanıt döner.
 */

export function createThread(input: CreateThreadInput): ChatThread {
  const db = getDb();
  const id = newId();
  const now = new Date().toISOString();

  db.insert(chatThreads)
    .values({
      id,
      title: input.title ?? 'Yeni Sohbet',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return getThread(id)!;
}

export function getThread(id: string): ChatThread | null {
  return getDb()
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.id, id))
    .get() ?? null;
}

export function listThreads(): ChatThread[] {
  const db = getDb();
  return db
    .select()
    .from(chatThreads)
    .orderBy(desc(chatThreads.updatedAt))
    .all();
}

export function updateThread(
  id: string,
  patch: { title?: string },
): ChatThread {
  const db = getDb();
  const now = new Date().toISOString();

  db.update(chatThreads)
    .set({ ...patch, updatedAt: now })
    .where(eq(chatThreads.id, id))
    .run();

  const updated = getThread(id);
  if (!updated) throw new Error('Sohbet bulunamadı.');
  return updated;
}

export function deleteThread(id: string): void {
  getDb().delete(chatThreads).where(eq(chatThreads.id, id)).run();
}

export function createMessage(input: CreateMessageInput): ChatMessage {
  const db = getDb();
  const id = newId();
  const now = new Date().toISOString();

  db.insert(chatMessages)
    .values({
      id,
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      model: input.model ?? null,
      tokensIn: input.tokensIn ?? null,
      tokensOut: input.tokensOut ?? null,
      costEst: input.costEst ?? null,
      createdAt: now,
    })
    .run();

  // Sohbet güncelleme zamanını refresh et
  db.update(chatThreads)
    .set({ updatedAt: now })
    .where(eq(chatThreads.id, input.threadId))
    .run();

  return getMessage(id)!;
}

export function getMessage(id: string): ChatMessage | null {
  return getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, id))
    .get() ?? null;
}

export function listMessages(threadId: string): ChatMessage[] {
  const db = getDb();
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(chatMessages.createdAt)
    .all();
}

/**
 * Mock AI yanıtı — gerçek LLM entegrasyonu eklenmeden önce geliştiriciye
 * kullanıcı mesajına dayalı basit bir yanıt döner.
 */
export function generateMockResponse(userContent: string): string {
  const lower = userContent.toLowerCase();

  if (lower.includes('merhaba') || lower.includes('selam')) {
    return 'Merhaba! Ben Muse, Plot\'un AI asistanınızıyım. Size nasıl yardımcı olabilirim?';
  }
  if (lower.includes('görev') || lower.includes('task')) {
    return 'Görevlerinizi organize etmenize yardımcı olabilirim. Önceki olarak 3 must-do kısıtlamasıyla en önemli işlerinize odaklanmanızı öneririm.';
  }
  if (lower.includes('plan') || lower.includes('planla')) {
    return 'Günlük planınızı ayarlamak için Enerji seçiciyi ve haftalık görünümü kullanabilirsiniz. Hangi gün için planlamak istiyorsunuz?';
  }
  if (lower.includes('not') || lower.includes('note')) {
    return 'Bağlantılı not ağınızı kurabilirsiniz. [[Başlık]] şeklinde notlar arasında link kurabilirsiniz.';
  }
  if (lower.includes('yardım') || lower.includes('help')) {
    return 'Şunlarla yardımcı olabilirim:\n• Görev oluşturma ve düzenleme\n• Günlük planlama ve enerji ayarı\n• Not bağlantıları\n• Odak oturumu takibi\n\nNe yapmak istiyorsun?';
  }

  return 'Mesajınızı aldım. Şu an için mock modundayım; gerçek AI yanıtları için LLM entegrasyonu eklenmesi gerekiyor.';
}