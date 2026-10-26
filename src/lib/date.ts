/** Tarih biçimlendirme yardımları — hepsi yerel zaman diliminde çalışır. */

const longDate = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
});
const weekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' });
const clock = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });

export function todayLabel(now: Date = new Date()): string {
  return longDate.format(now);
}

export function weekdayName(now: Date = new Date()): string {
  return weekday.format(now);
}

/** Sahaya göre selamlama; "iyi akşamlar" demeye çalışmak yerine kısa ve sakin. */
export function greetingLabel(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 6) return 'Gece yarısı';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export function clockLabel(now: Date = new Date()): string {
  return clock.format(now);
}

// ─── Gün sınırları ───────────────────────────────────────────────────────────

/**
 * Yerel gün anahtarı: `YYYY-MM-DD`.
 *
 * Tüm "bugün" sorguları bu anahtarla kurulur. UTC'ye çevirmek günü
 * kaydırabileceği için sınırlar yerel gece yarısından hesaplanır.
 */
export function localDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date: Date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Bitiş özeldir (exclusive): ertesi günün 00:00'ı. */
export function endOfLocalDay(date: Date = new Date()): Date {
  const copy = startOfLocalDay(date);
  copy.setDate(copy.getDate() + 1);
  return copy;
}

/** Sorgu sınırları: ISO-8601 UTC, yerel güne denk. */
export function dayBounds(date: Date = new Date()): { key: string; start: string; end: string } {
  return {
    key: localDayKey(date),
    start: startOfLocalDay(date).toISOString(),
    end: endOfLocalDay(date).toISOString(),
  };
}

/** Gün anahtarını yerel öğlene çevirir: DST geçişlerinde gün kaymaz. */
export function dateFromDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

export function dayKeyLabel(key: string): string {
  return longDate.format(dateFromDayKey(key));
}

export function addLocalDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// ─── Saat yardımcıları ───────────────────────────────────────────────────────

/** ISO zamanı yerel `HH:mm` olarak gösterir. */
export function timeLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  return clock.format(new Date(iso));
}

/** ISO zamanın yerel gün içindeki dakikası (00:00 = 0). */
export function minutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return localDayKey(a) === localDayKey(b);
}
