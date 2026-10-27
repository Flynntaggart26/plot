import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { settings } from '@/db/schema';
import type { AppearanceMode } from '@/ui/theme';

/**
 * Kullanıcı tercihleri — `settings` tablosunda anahtar/değer olarak tutulur.
 *
 * Seed varsayılanları (`locale`, `must_do_limit`, `schema_version`) da burada
 * yaşar; bu modül yalnızca okuma/yazma kapısıdır, varsayılan üretmez.
 */

export const APPEARANCE_KEY = 'appearance_mode';

export function getSetting(key: string): string | null {
  const row = getDb()
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .get();

  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

const APPEARANCE_MODES: readonly AppearanceMode[] = ['system', 'light', 'dark'];

export function parseAppearance(raw: string | null): AppearanceMode | null {
  return APPEARANCE_MODES.includes(raw as AppearanceMode) ? (raw as AppearanceMode) : null;
}

export function getAppearanceSetting(): AppearanceMode | null {
  return parseAppearance(getSetting(APPEARANCE_KEY));
}

export function setAppearanceSetting(mode: AppearanceMode): void {
  setSetting(APPEARANCE_KEY, mode);
}
