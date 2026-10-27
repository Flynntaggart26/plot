import React from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radius as radiusTokens } from '../tokens';
import { Sheen } from './Sheen';

/**
 * Yükleme iskeleti: spinner yerine içeriğin şekli.
 *
 * Ekran zıplamaz, çünkü iskelet gerçek satırın yerini ve boyunu tutar.
 * Parlama yalnızca bir kez değil, veri gelene kadar yavaşça döner.
 */
export function ShimmerBlock({
  height = 14,
  width = '100%',
  radius = radiusTokens.sm,
  style,
}: {
  height?: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View
      style={[
        { height, width, borderRadius: radius, backgroundColor: c.surfaceRaised, overflow: 'hidden' },
        style,
      ]}
    >
      <Sheen color={c.sheen} intensity={0.14} durationMs={1300} delayMs={200} />
    </View>
  );
}

/** Liste satırı iskeleti: solda ikon yuvası, sağda iki metin satırı. */
export function SkeletonRow({ compact = false }: { compact?: boolean }) {
  const { space } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          gap: space.sm,
          paddingVertical: compact ? space.sm : space.md,
        },
      ]}
    >
      <ShimmerBlock height={compact ? 24 : 40} width={compact ? 24 : 40} radius={compact ? 12 : 12} />
      <View style={{ flex: 1, gap: 8 }}>
        <ShimmerBlock height={12} width="62%" />
        <ShimmerBlock height={10} width="34%" />
      </View>
    </View>
  );
}

/** Kart içi kısa iskelet: görev listesi gibi yoğun alanlar için. */
export function SkeletonLines({ lines = 2 }: { lines?: number }) {
  return (
    <View style={{ gap: 12, paddingVertical: 16 }}>
      {Array.from({ length: lines }).map((_, index) => (
        <View key={index} style={styles.line}>
          <ShimmerBlock height={20} width={20} radius={10} />
          <ShimmerBlock height={12} width={index % 2 === 0 ? '68%' : '48%'} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonRow key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
