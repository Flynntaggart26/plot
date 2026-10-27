/**
 * Plot — tasarım token'ları.
 *
 * Tek kural: hiçbir bileşen ham renk/süre değeri yayınlamaz.
 * Renk, tipografi, boşluk, köşe ve hareket buradan gelir.
 * Yeni animasyon eklerken sorulacak soru: "Bu hareket hangi bilgiyi taşıyor?"
 * Cevabı yoksa eklenmez.
 */

// ─── Renk ────────────────────────────────────────────────────────────────────

export type ColorTokens = {
  /** En arka katman, ekran zemini */
  bg: string;
  /** Kart yüzeyi */
  surface: string;
  /** Bir katman yukarı — bottom sheet, raised kart */
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** Tek vurgu rengi — aynı anda ekranın en fazla iki yerinde kullanılır */
  accent: string;
  accentSoft: string;
  /** Odak halkası ve tamamlama */
  focus: string;
  focusSoft: string;
  warning: string;
  danger: string;
  /** Overlay / karartma */
  scrim: string;
  /** Parlama bandı: metal üzerinde kayan ışık */
  sheen: string;
  /** Kart/buton üst kenarındaki ince ışık çizgisi */
  edge: string;
  /** Gradyan zeminler için vurgunun çok açık hâli */
  accentGlow: string;
};

export const color = {
  dark: {
    bg: '#0E0E10',
    surface: '#16161A',
    surfaceRaised: '#1E1E24',
    border: '#2A2A32',
    borderStrong: '#3A3A44',
    text: '#F2EDE6',
    textMuted: '#9A948C',
    /** Küçük metin bile AA: #0E0E10 üzerinde 5.21:1 */
    textFaint: '#8A847C',
    accent: '#E8A33D',
    accentSoft: '#E8A33D22',
    focus: '#7BE0AD',
    focusSoft: '#7BE0AD1F',
    warning: '#D9A441',
    danger: '#E5675C',
    scrim: '#000000AA',
    sheen: '#FFF4DC',
    edge: '#FFFFFF1F',
    accentGlow: '#E8A33D1F',
  } satisfies ColorTokens,
  light: {
    bg: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceRaised: '#F1EDE7',
    border: '#E4DED5',
    borderStrong: '#CCC5B9',
    text: '#1B1917',
    textMuted: '#6E6961',
    /** Küçük metin bile AA: #FAF8F5 üzerinde 4.54:1 */
    textFaint: '#787168',
    /** Küçük metin AA: bg 4.93:1, beyaz 5.22:1 */
    accent: '#94621A',
    accentSoft: '#94621A1A',
    focus: '#2F9E6A',
    focusSoft: '#2F9E6A14',
    warning: '#94621A',
    danger: '#C24B41',
    scrim: '#1B191766',
    sheen: '#FFFFFF',
    edge: '#94621A14',
    accentGlow: '#94621A12',
  } satisfies ColorTokens,
};

// ─── Tipografi ───────────────────────────────────────────────────────────────

export type TypeRole = {
  /** Taban aile. Inter için ağırlık ayrı font dosyasına çözülür. */
  family: string;
  size: number;
  weight: '300' | '400' | '500' | '600';
  letterSpacing?: number;
  /** Sayısal alanlarda zıplama olmasın diye tabular evrensel açık */
  tabular?: boolean;
  lineHeight?: number;
};

/**
 * Rol tanımları. `as const satisfies` sayesinde anahtarlar tip olarak korunur:
 * AppText yalnızca burada tanımlı rolleri kabul eder, yazım hatası derlemede yakalanır.
 */
export const type = {
  display: { family: 'InstrumentSerif_400Regular', size: 34, weight: '400', lineHeight: 40 },
  title: { family: 'Inter_400Regular', size: 22, weight: '500', lineHeight: 28 },
  section: { family: 'Inter_400Regular', size: 18, weight: '600', lineHeight: 24 },
  body: { family: 'Inter_400Regular', size: 15, weight: '400', lineHeight: 22 },
  bodyStrong: { family: 'Inter_400Regular', size: 15, weight: '600', lineHeight: 22 },
  meta: { family: 'Inter_400Regular', size: 12, weight: '500', letterSpacing: 0.3, lineHeight: 16 },
  tab: { family: 'Inter_400Regular', size: 11.5, weight: '500', letterSpacing: 0.2, lineHeight: 14 },
  timer: { family: 'Inter_400Regular', size: 64, weight: '300', letterSpacing: -1, tabular: true, lineHeight: 72 },
} as const satisfies Record<string, TypeRole>;

export type TypeName = keyof typeof type;

/**
 * Rolü gerçek font dosyasına çevirir. Android özel ailelerde `fontWeight`
 * sentetik kalınlık üretmediği için 300/500/600 ayrı Inter dosyalarından gelir.
 */
const INTER_FACE = {
  '300': 'Inter_300Light',
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
} as const;

export function fontFaceFor(role: TypeRole): string {
  return role.family.startsWith('Inter') ? INTER_FACE[role.weight] : role.family;
}

// ─── Boşluk → 4'lük grid ─────────────────────────────────────────────────────

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

// ─── Işık / Parlaklık ────────────────────────────────────────────────────────

/**
 * Odak modunda ve vurgulu elemanlarda kullanılan parlaklık gölgeleri.
 * Native'de `shadowColor` + `elevation`, web'de `box-shadow` olarak uygulanır.
 */
export const glow = {
  /** Hafif parlaklık — kart kenarları, butonlar */
  soft: {
    shadowColor: '#E8A33D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  /** Orta parlaklık — aktif sekme, FAB */
  medium: {
    shadowColor: '#E8A33D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  /** Yoğun parlaklık — aktif odak halkası */
  strong: {
    shadowColor: '#E8A33D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// ─── Köşe ────────────────────────────────────────────────────────────────────

export const radius = {
  sm: 10,
  md: 14,
  card: 20,
  sheet: 28,
  pill: 999,
} as const;

// ─── Hareket ─────────────────────────────────────────────────────────────────

/**
 * Kurallar:
 * - Giriş 200–320 ms; çıkış girişten %30 hızlı
 * - Animasyon input'u asla bloklamaz
 * - reduceMotion açıkken yalnızca 120 ms opacity geçişi
 */
export const duration = {
  /** çıkışlar, sadeleşmiş geçişler */
  fast: 120,
  /** çıkışlar */
  out: 160,
  /** girişler */
  in: 240,
  /** yavaş genişleme: sheet, plan stagger */
  slow: 320,
} as const;

export const spring = {
  /** ekran geçişi, kart açılma */
  gentle: { damping: 18, stiffness: 160, mass: 0.9 },
  /** buton, chip */
  snappy: { damping: 22, stiffness: 260, mass: 0.7 },
  /** liste yerleşimi */
  settle: { damping: 26, stiffness: 200, mass: 1.0 },
} as const;

export const stagger = { step: 40 } as const;

// ─── Haptik yoğunluk ─────────────────────────────────────────────────────────

export type HapticStrength = 'tick' | 'light' | 'medium' | 'success';
