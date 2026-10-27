/**
 * Küçük renk yardımcıları.
 *
 * Bileşenler ham renk yazmaz; token rengini saydamlaştırmak veya
 * aydınlatmak gerektiğinde buradan geçer. Böylece "parlaklık" tek bir
 * yerden ayarlanır ve tema değişince kendiliğinden uyum sağlar.
 */

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parseHex(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}

/** `#RRGGBB` veya `#RRGGBBAA` → `rgba(...)`; alfa verilirse onu kullanır. */
export function alpha(hex: string, opacity: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(opacity)})`;
}

/** Rengi beyaza (`amount` 0–1) doğru açar — metal üst kenarı için. */
export function lighten(hex: string, amount: number): string {
  return mixWith(hex, { r: 255, g: 255, b: 255 }, amount);
}

/** Rengi siyaha doğru koyulaştırır — gradyanın alt ucu için. */
export function darken(hex: string, amount: number): string {
  return mixWith(hex, { r: 0, g: 0, b: 0 }, amount);
}

function mixWith(hex: string, target: { r: number; g: number; b: number }, amount: number): string {
  const { r, g, b, a } = parseHex(hex);
  const t = clamp01(amount);
  const blend = (from: number, to: number) => Math.round(from + (to - from) * t);
  const output = `rgba(${blend(r, target.r)}, ${blend(g, target.g)}, ${blend(b, target.b)}, ${a})`;
  return output;
}
