/**
 * Tekrarlayan görev kuralları.
 *
 * Kural metni kısa ve okunabilir tutulur; RRULE kütüphanesi yok:
 * - `daily`
 * - `weekly:1`  (1 = pazartesi … 7 = pazar)
 * - `monthly:15` (ayın günü)
 *
 * Kural, görevin kendisinde saklanır; görev tamamlanınca bir sonraki
 * örnek üretilir. Böylece "seri" diye ayrı bir tablo açmaya gerek kalmaz.
 */

export type RecurrenceKind = 'daily' | 'weekly' | 'monthly';

export type Recurrence = {
  kind: RecurrenceKind;
  /** 1 = pazartesi … 7 = pazar (yalnızca weekly). */
  weekday?: number;
  /** 1–31 (yalnızca monthly). */
  dayOfMonth?: number;
};

const WEEKDAY_NAMES = [
  'pazartesi',
  'salı',
  'çarşamba',
  'perşembe',
  'cuma',
  'cumartesi',
  'pazar',
] as const;

/** JS `getDay()` pazar = 0 döner; kuralda pazartesi = 1 kullanılır. */
export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function parseRecurrence(raw: string | null | undefined): Recurrence | null {
  if (!raw) return null;

  const [kind, value] = raw.split(':');

  if (kind === 'daily') return { kind };

  if (kind === 'weekly') {
    const weekday = Number(value);
    if (Number.isInteger(weekday) && weekday >= 1 && weekday <= 7) {
      return { kind, weekday };
    }
  }

  if (kind === 'monthly') {
    const dayOfMonth = Number(value);
    if (Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31) {
      return { kind, dayOfMonth };
    }
  }

  return null;
}

/** Seçilen türü, çapaya (görevin günü) göre somut bir kurala çevirir. */
export function buildRecurrence(kind: RecurrenceKind | null, anchor: Date): string | null {
  if (kind === 'daily') return 'daily';
  if (kind === 'weekly') return `weekly:${isoWeekday(anchor)}`;
  if (kind === 'monthly') return `monthly:${anchor.getDate()}`;
  return null;
}

export function recurrenceKind(raw: string | null | undefined): RecurrenceKind | null {
  return parseRecurrence(raw)?.kind ?? null;
}

/** Kullanıcıya gösterilen kısa etiket. */
export function recurrenceLabel(raw: string | null | undefined): string | null {
  const rule = parseRecurrence(raw);
  if (!rule) return null;

  if (rule.kind === 'daily') return 'Her gün';
  if (rule.kind === 'weekly') return `Her ${WEEKDAY_NAMES[rule.weekday! - 1]}`;
  return `Her ayın ${rule.dayOfMonth}. günü`;
}

/** Aynı gün içindeki saat/dakikayı koruyarak bir sonraki tekrarı hesaplar. */
export function nextOccurrence(raw: string, fromISO: string): string | null {
  const rule = parseRecurrence(raw);
  if (!rule) return null;

  const next = new Date(fromISO);
  if (Number.isNaN(next.getTime())) return null;

  if (rule.kind === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (rule.kind === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else {
    // Ay taşmasını engelle: 31 Ocak + 1 ay = 3 Mart değil, 28/29 Şubat.
    const day = rule.dayOfMonth ?? next.getDate();
    const targetMonth = next.getMonth() + 1;
    const targetYear = next.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    next.setFullYear(targetYear, normalizedMonth, Math.min(day, lastDay));
  }

  return next.toISOString();
}

/**
 * Geçmişte kalmayan ilk tekrarı döndürür.
 *
 * Görev birkaç gün gecikmeli tamamlanırsa kaçırılan günler için ayrı ayrı
 * görev üretilmez; seri bugünden ileri taşınır.
 */
export function nextFutureOccurrence(
  raw: string,
  fromISO: string,
  now: Date = new Date(),
): string | null {
  let next = nextOccurrence(raw, fromISO);

  // 400 gün: günlük kural için bile fazlasıyla yeterli bir üst sınır.
  for (let guard = 0; next && new Date(next) <= now && guard < 400; guard += 1) {
    next = nextOccurrence(raw, next);
  }

  return next;
}
