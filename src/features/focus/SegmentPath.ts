/**
 * Segment path hesaplama — Focus ring dış halka segmentleri.
 * Spec: docs/superpowers/specs/2026-10-28-focus-ring-design.md
 * 
 * Her segment eşit açıda (2π/total), aralarında küçük gap.
 * Progress 0-1 arası doğrusal dolum.
 */

export const SEGMENT_GAP = 0.02; // radyan - segmentler arası boşluk

export interface SegmentPathParams {
  index: number;        // Segment indeksi (0-based)
  total: number;        // Toplam segment sayısı
  progress: number;     // 0-1 arası doluluk
  radius: number;       // Segment yarıçapı (R_OUTER)
  center: number;       // SVG merkez koordinatı (150)
}

export function createSegmentPath({ index, total, progress, radius, center }: SegmentPathParams): string {
  // Temiz eşit segmentler: her biri (2π/total) açıda, aralarında gap
  const gap = SEGMENT_GAP;
  const segmentAngle = (2 * Math.PI) / total;
  const startAngle = index * segmentAngle - Math.PI / 2 + gap / 2;
  // Progress 1.0 olduğunda segment tam dolu (gap hariç)
  const sweepAngle = (segmentAngle - gap) * Math.min(Math.max(progress, 0), 1);
  const endAngle = startAngle + sweepAngle;
  
  const largeArc = sweepAngle > Math.PI ? 1 : 0;
  const x1 = center + radius * Math.cos(startAngle);
  const y1 = center + radius * Math.sin(startAngle);
  const x2 = center + radius * Math.cos(endAngle);
  const y2 = center + radius * Math.sin(endAngle);
  
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * Tüm segment path'lerini üretir (background + foreground için)
 */
export function generateAllSegmentPaths(
  total: number, 
  radius: number, 
  center: number
): { bgPath: string; fgPath: (progress: number) => string }[] {
  return Array.from({ length: total }, (_, i) => ({
    bgPath: createSegmentPath({ index: i, total, progress: 1, radius, center }),
    fgPath: (progress: number) => createSegmentPath({ index: i, total, progress, radius, center }),
  }));
}

/**
 * SVG viewBox ve ölçü sabitleri
 */
export const FOCUS_RING_CONSTANTS = {
  SVG_SIZE: 300,
  CENTER: 150,
  R_INNER: 112,      // İç halka yarıçapı
  R_OUTER: 138,      // Dış segment yarıçapı
  W_INNER: 24,       // İç halka kalınlığı
  W_OUTER: 8,        // Dış segment kalınlığı
  DASH_INNER: 2 * Math.PI * 112, // 703.72
} as const;