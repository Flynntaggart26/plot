import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTheme } from '../theme';
import { AppText } from './Screen';
import { usePressScale } from '../motion/hooks';
import { haptic } from '@/lib/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Tek buton bileşeni. Yükseklik 48: hem dokunma hedefi hem form ritmi.
 * Yıkıcı eylem dolu kırmızı değil, çerçeveli: hata yapmayı zorlaştırmaz,
 * ama gözden kaçırmayı da engeller.
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

  return (
    <Animated.View style={[pressStyle, { opacity: inactive ? 0.55 : 1 }, style]}>
      <Pressable
        {...handlers}
        onPress={() => {
          if (inactive) return;
          haptic('light');
          onPress();
        }}
        disabled={inactive}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        aria-disabled={inactive}
        aria-busy={loading}
        style={[
          styles.button,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
            borderRadius: radius.pill,
            paddingHorizontal: space.lg,
            gap: space.xs,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.label} />
        ) : icon ? (
          <Ionicons name={icon} size={18} color={palette.label} />
        ) : null}
        <AppText variant="bodyStrong" style={{ color: palette.label, fontSize: type.body.size }}>
          {label}
        </AppText>
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
  },
});
