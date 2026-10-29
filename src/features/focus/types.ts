/**
 * Focus (Odak) feature tipi tanımları.
 * Spec: docs/superpowers/specs/2026-10-28-focus-ring-design.md
 */

export type FocusMode = 'work' | 'break';

export interface FocusState {
  mode: FocusMode;
  duration: number;              // saniye (planlanan süre)
  timeLeft: number;              // kalan saniye
  totalSessions: number;         // 2 | 3 | 4 | 5 | 6 | 8
  completedWorkSessions: number; // KALICI - sadece reset'te 0
  currentSessionProgress: number; // 0-1, her tick güncellenir
  isRunning: boolean;

  // Renkler (sadece Çalışma modunda kullanıcı değiştirir)
  innerColor: string;      // Çalışma iç halka
  outerColor: string;      // Çalışma dış halka / segmentler
  breakInnerColor: string; // Mola iç halka (sabit)
  breakOuterColor: string; // Mola dış halka / segmentler (sabit)
}

// Veritabanı ayar anahtarları
export const FOCUS_SETTINGS_KEYS = {
  duration: 'focus_duration_min',
  totalSessions: 'focus_total_sessions',
  innerColor: 'focus_inner_color',
  outerColor: 'focus_outer_color',
  completedWorkSessions: 'focus_completed_work_sessions',
} as const;

// Varsayılan değerler
export const FOCUS_DEFAULTS = {
  duration: 25,
  totalSessions: 4,
  innerColor: '#E8A33D',    // accent (altın)
  outerColor: '#FFD47A',    // accent açık
  breakInnerColor: '#FF6B2E', // turuncu
  breakOuterColor: '#FF9F5A', // açık turuncu
  completedWorkSessions: 0,
} as const;