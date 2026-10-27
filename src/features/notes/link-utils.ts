/**
 * Başlık ve arama normalizasyonu.
 *
 * Türkçe büyük/küçük harf katlaması SQLite'ın `lower()` fonksiyonunda
 * güvenilir değil (İ ve ı farklı harflere düşer), bu yüzden başlık
 * eşleştirmesi ve arama bellekte bu yardımcıyla yapılır.
 */
import type { Note } from '@/db/schema';

/** Aksanları ve Türkçe'ye özgü harf farklarını siler. */
export function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    // Birleşik aksan işaretleri (ş → s + ̧ gibi) ayrıştıktan sonra silinir.
    .replace(/[\u0300-\u036f]/g, '')
    // Türkçe küçük noktasız ı, NFD ile i'ye dönüşmez.
    .replace(/ı/g, 'i');
}

/** Başlıkları karşılaştırmak için: boşlukları sadeleştirip normalize eder. */
export function normalizeTitle(title: string): string {
  return normalizeText(title.trim().replace(/\s+/g, ' '));
}

/**
 * Gövdeyi aramada gösterilecek düz metne çevirir: markdown işaretleri
 * ve [[ ]] parantezleri atılır, başlık/madde işaretleri temizlenir.
 */
export function toPlainLine(line: string): string {
  return line
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^\s{0,3}>\s?/, '')
    .replace(/^\s{0,3}[-*+]\s+/, '')
    .replace(/^\s{0,3}\d+\.\s+/, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

/**
 * Eşleşen satırdan kısa alıntı üretir. Normalize edilmiş metindeki konum
 * birebir özgün metne taşınamadığı için oransal yaklaşım kullanılır; amaç
 * karakter hassasiyeti değil, kullanıcıya bağlam göstermek.
 */
export function excerptFor(line: string, query: string, radius = 44): string {
  const plain = toPlainLine(line);
  if (!plain) return '';
  const normalized = normalizeText(plain);
  const needle = normalizeText(query.trim());
  const at = needle ? normalized.indexOf(needle) : -1;

  if (at < 0 || plain.length <= radius * 2) {
    return plain.length > radius * 2 ? `${plain.slice(0, radius * 2).trimEnd()}…` : plain;
  }

  const approx = Math.round((at / Math.max(normalized.length, 1)) * plain.length);
  const start = Math.max(0, approx - radius);
  const end = Math.min(plain.length, approx + needle.length + radius);
  return `${start > 0 ? '…' : ''}${plain.slice(start, end).trim()}${end < plain.length ? '…' : ''}`;
}

/** Arama sonucu; başlıkta eşleşme varsa alıntı boştur. */
export type NoteSearchResult = {
  note: Note;
  excerpt: string | null;
};

/**
 * Başlık ve gövdede arama. Veri kişisel ölçekte olduğu için SQL yerine
 * bellekte çalışır: Türkçe harf katlaması ve aksan duyarsızlığı böylece
 * tek yerden yönetilir.
 */
export function searchNoteList(all: Note[], query: string): NoteSearchResult[] {
  const needle = normalizeText(query.trim());
  if (!needle) return all.map((note) => ({ note, excerpt: null }));

  const results: NoteSearchResult[] = [];
  for (const note of all) {
    if (normalizeText(note.title).includes(needle)) {
      results.push({ note, excerpt: null });
      continue;
    }
    const match = note.bodyMd
      .split(/\r?\n/)
      .find((line) => normalizeText(toPlainLine(line)).includes(needle));
    if (match !== undefined) {
      results.push({ note, excerpt: excerptFor(match, query) });
    }
  }
  return results;
}
