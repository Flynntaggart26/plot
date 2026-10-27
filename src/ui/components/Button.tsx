import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { useTheme } from '../theme';
import { AppText } from './Screen';
import { Sheen } from './Sheen';
import { usePressScale } from '../motion/hooks';
import { haptic } from '@/lib/haptics';
import { alpha, darken, lighten } from '../color';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Tek buton bileşeni. Yükseklik 48: hem dokunma hedefi hem form ritmi.
 * Yıkıcı eylem dolu kırmızı değil, çerçeveli: hata yapmayı zorlaştırmaz,
 * ama gözden kaçırmayı da engeller.
 *
 * Birincil buton pirinç gibi davranır: üstten ışık alır, üzerinden ince bir
 * parlama geçer, basınca yayla geri döner. Bu efektler bilgi taşımaz;
 * reduce motion açıkken yalnızca renk kalır.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const { c, radius, space, type } = useTheme();
  const inactive = disabled || loading;
  const { style: pressStyle, handlers } = usePressScale(inactive);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const palette = (() => {
    switch (variant) {
      case 'primary':
        return { background: c.accent, border: c.accent, label: c.bg };
      case 'secondary':
        return { background: c.surface, border: c.border, label: c.text };
      case 'ghost':
        return { background: 'transparent', border: 'transparent', label: c.accent };
      case 'danger':
        return { background: 'transparent', border: c.danger, label: c.danger };
    }
  })();

  // Hover yalnızca masaüstünde anlamlı; dokunmatikte parmak kalkınca sıfırlanır.
  const hoveredBackground =
    variant === 'primary'
      ? lighten(c.accent, 0.06)
      : variant === 'danger'
        ? alpha(c.danger, 0.1)
        : c.surfaceRaised;

  const borderColor = !hovered || inactive
    ? palette.border
    : variant === 'secondary'
      ? alpha(c.accent, 0.45)
      : variant === 'danger'
        ? alpha(c.danger, 0.9)
        : variant === 'ghost'
          ? 'transparent'
          : alpha(c.accent, 0.9);

  return (
    <Animated.View style={[pressStyle, { opacity: inactive ? 0.55 : 1 }, style]}>
      <Pressable
        {...handlers}
        onPress={() => {
          if (inactive) return;
          haptic('light');
          onPress();
        }}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={inactive}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        aria-disabled={inactive}
        aria-busy={loading}
        style={[
          styles.button,
          {
            backgroundColor: variant === 'primary' ? c.accent : hovered ? hoveredBackground : palette.background,
            borderColor,
            borderRadius: radius.pill,
            paddingHorizontal: space.lg,
            gap: space.xs,
            overflow: 'hidden',
            cursor: inactive ? 'auto' : 'pointer',
          },
        ]}
      >
        {variant === 'primary' ? (
          <LinearGradient
            pointerEvents="none"
            colors={[lighten(c.accent, 0.16), c.accent, darken(c.accent, 0.08)]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {variant === 'primary' ? (
          <Sheen color={c.sheen} intensity={0.3} durationMs={1300} delayMs={350} loop={false} />
        ) : (
          <Sheen
            color={c.sheen}
            intensity={hovered ? 0.12 : 0}
            durationMs={900}
            delayMs={0}
            loop={false}
            active={hovered}
          />
        )}

        <View
          pointerEvents="none"
          style={[
            styles.edge,
            {
              backgroundColor: variant === 'primary' ? alpha('#FFFFFF', 0.32) : alpha(c.sheen, 0.1),
            },
          ]}
        />

        {loading ? (
          <ActivityIndicator size="small" color={palette.label} />
        ) : icon ? (
          <Ionicons name={icon} size={18} color={palette.label} />
        ) : null}
        <AppText variant="bodyStrong" style={{ color: palette.label, fontSize: type.body.size }}>
          {label}
        </AppText>

        {focused ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: radius.pill,
                borderWidth: 2,
                borderColor: c.focus,
              },
            ]}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as unknown as 'solid' } : null),
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: StyleSheet.hairlineWidth * 2,
  },
});
