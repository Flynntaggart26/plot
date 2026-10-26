import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { dailyPlans } from '@/db/schema';
import { localDayKey } from '@/lib/date';

/**
 * Günün niyeti ve enerjisi. Enerji 1–5; `null` seçim yapılmadı demektir.
 * `daily_plans` satırı yoksa gün henüz "açılmamış"tır — okuma bunu yaratmaz.
 */
export function getDayEnergy(dayKey: string = localDayKey()): number | null {
  const row = getDb()
    .select({ energy: dailyPlans.energy })
    .from(dailyPlans)
    .where(eq(dailyPlans.date, dayKey))
    .get();
  return row?.energy ?? null;
}

export function setDayEnergy(energy: number, dayKey: string = localDayKey()): void {
  if (!Number.isInteger(energy) || energy < 1 || energy > 5) {
    throw new Error('Enerji 1 ile 5 arasında olmalı.');
  }

  getDb()
    .insert(dailyPlans)
    .values({ date: dayKey, energy })
    .onConflictDoUpdate({ target: dailyPlans.date, set: { energy } })
    .run();
}

/** Seçimi temizler; satır diğer alanları korumak için silinmez. */
export function clearDayEnergy(dayKey: string = localDayKey()): void {
  getDb().update(dailyPlans).set({ energy: null }).where(eq(dailyPlans.date, dayKey)).run();
}
