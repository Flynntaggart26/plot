import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './Screen';
import { fontFaceFor } from '../tokens';

/**
 * Form alanı: etiket + giriş + tek satır ipucu/hata.
 * Odak çerçevesi vurgu rengine döner; hata varsa alan kırmızıya geçmez,
 * altındaki satır hatayı söyler (renk tek başına anlam taşımaz).
 */
export function TextField({
  label,
  hint,
  error,
  multiline = false,
  style,
  ...rest
}: TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  style?: TextInputProps['style'];
}) {
  const { c, space, radius, type } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: space.xxs }}>
      {label ? (
        <AppText variant="meta" muted style={{ letterSpacing: 0.6 }}>
          {label}
        </AppText>
      ) : null}

      <TextInput
        {...rest}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          rest.onBlur?.(event);
        }}
        placeholderTextColor={c.textFaint}
        selectionColor={c.accent}
        style={[
          styles.input,
          {
            fontFamily: fontFaceFor(type.body),
            fontSize: type.body.size,
            lineHeight: type.body.lineHeight,
            color: c.text,
            backgroundColor: c.surface,
            borderColor: error ? c.danger : focused ? c.accent : c.border,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            minHeight: multiline ? 112 : 48,
          },
          multiline && styles.multiline,
          style,
        ]}
      />

      {error ? (
        <AppText variant="meta" style={{ color: c.danger }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="meta" faint>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    textAlignVertical: 'center',
  },
  multiline: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});
