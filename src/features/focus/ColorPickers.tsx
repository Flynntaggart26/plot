import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorButton } from '@/ui/components/ColorButton';
import { AppText } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { isLightColor } from '@/ui/color';
import { useFocusStore } from './store';

/** Halka için hazır palet: sıcak metal tonlarından serin vurgulara. */
const PRESETS = ['#E8A33D', '#FFD47A', '#7BE0AD', '#6BB6FF', '#B79CFF', '#FF8FA3'];

function ColorRow({
  label,
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  disabled: boolean;
  accessibilityLabel: string;
}) {
  const { c, space, type } = useTheme();
  const custom = !PRESETS.some((preset) => preset.toLowerCase() === value.toLowerCase());

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.rowHead}>
        <AppText variant="meta" muted>
          {label}
        </AppText>
        <AppText variant="meta" faint style={styles.hex}>
          {value.toUpperCase()}
        </AppText>
      </View>

      <View
        style={[styles.swatches, { gap: space.xs }]}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
      >
        {PRESETS.map((preset) => (
          <ColorButton
            key={preset}
            value={preset}
            selected={!custom && preset.toLowerCase() === value.toLowerCase()}
            onPress={() => {
              haptic('tick');
              onChange(preset);
            }}
            label={`${label}: ${preset}`}
            disabled={disabled}
          />
        ))}

        {Platform.OS === 'web' ? (
          <View
            style={[
              styles.custom,
              {
                borderColor: custom ? c.text : c.border,
                borderWidth: custom ? 2 : StyleSheet.hairlineWidth,
                backgroundColor: custom ? value : c.surfaceRaised,
                borderRadius: 18,
              },
            ]}
          >
            <Ionicons
              name="color-palette-outline"
              size={17}
              color={custom ? (isLightColor(value) ? '#17140F' : '#FFFFFF') : c.textMuted}
            />
            <input
              type="color"
              value={value}
              onChange={(event) => {
                haptic('tick');
                onChange(event.target.value);
              }}
              disabled={disabled}
              aria-label={accessibilityLabel}
              style={
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: disabled ? 'default' : 'pointer',
                  fontFamily: type.body.family,
                } as React.CSSProperties
              }
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Odak halkası renkleri. Yalnızca çalışma modunda anlamlıdır; molada
 * sıcak turuncu sabittir. Web'de paletin yanında sistem renk seçicisi de
 * durur, mobilde hazır palet tek dokunuşla yeter.
 */
export function ColorPickers() {
  const { space } = useTheme();
  const mode = useFocusStore((state) => state.mode);
  const isRunning = useFocusStore((state) => state.isRunning);
  const innerColor = useFocusStore((state) => state.innerColor);
  const outerColor = useFocusStore((state) => state.outerColor);
  const setInnerColor = useFocusStore((state) => state.setInnerColor);
  const setOuterColor = useFocusStore((state) => state.setOuterColor);

  if (mode !== 'work') return null;

  return (
    <View style={{ gap: space.sm }}>
      <ColorRow
        label="İç halka"
        value={innerColor}
        onChange={setInnerColor}
        disabled={isRunning}
        accessibilityLabel="İç halka rengi"
      />
      <ColorRow
        label="Dış halka"
        value={outerColor}
        onChange={setOuterColor}
        disabled={isRunning}
        accessibilityLabel="Dış halka rengi"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hex: {
    letterSpacing: 0.6,
    fontSize: 11,
  },
  swatches: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  custom: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
