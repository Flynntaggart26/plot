import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AppText } from './Screen';
import { fontFaceFor, space as spaceTokens } from '../tokens';
import { haptic } from '@/lib/haptics';

export type SelectOption = { value: string | number; label: string };

/**
 * Tema uyumlu seçici.
 *
 * Web'de gerçek bir `<select>` kullanılır: klavye, ekran okuyucu ve
 * tarayıcı otomatik tamamlama bedava gelir. Native'de DOM yoktur; bu
 * yüzden aynı görünümü veren, alt sayfa açan bir Pressable kullanılır.
 * Eski uygulama her platformda `<select>` çiziyordu ve mobilde çalışmıyordu.
 */
export function Select({
  value,
  options,
  onChange,
  disabled = false,
  accessibilityLabel,
  placeholder = 'Seç',
}: {
  value: string | number;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  placeholder?: string;
}) {
  const { c, radius, space, type } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => String(option.value) === String(value));

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.webWrap,
          {
            backgroundColor: c.surface,
            borderColor: disabled ? c.border : c.borderStrong,
            borderRadius: radius.md,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <select
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-label={accessibilityLabel}
          style={
            {
              width: '100%',
              minHeight: 46,
              padding: '0 40px 0 14px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: c.text,
              fontFamily: fontFaceFor(type.body),
              fontSize: type.body.size,
              fontWeight: 500,
              appearance: 'none',
              WebkitAppearance: 'none',
              cursor: disabled ? 'default' : 'pointer',
            } as React.CSSProperties
          }
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Ionicons
          name="chevron-down"
          size={16}
          color={c.textMuted}
          style={styles.webChevron}
          pointerEvents="none"
        />
      </View>
    );
  }

  const choose = (option: SelectOption) => {
    haptic('tick');
    onChange(String(option.value));
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          if (disabled) return;
          haptic('tick');
          setOpen(true);
        }}
        disabled={disabled}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel ?? placeholder}: ${selected?.label ?? placeholder}`}
        aria-disabled={disabled}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.xs,
          minHeight: 48,
          paddingHorizontal: space.md,
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          borderRadius: radius.md,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
          {selected?.label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={c.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Seçimi kapat"
        />
        <View style={[styles.sheetOuter, { paddingBottom: insets.bottom + space.md }]}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: c.surfaceRaised,
                borderColor: c.border,
                borderTopLeftRadius: radius.sheet,
                borderTopRightRadius: radius.sheet,
                paddingHorizontal: space.lg,
                paddingTop: space.sm,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
            <AppText variant="meta" muted style={{ letterSpacing: 1.1, marginTop: space.sm }}>
              {(accessibilityLabel ?? placeholder).toLocaleUpperCase('tr-TR')}
            </AppText>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const active = String(option.value) === String(value);
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => choose(option)}
                    accessibilityRole="button"
                    aria-selected={active}
                    style={{
                      minHeight: 48,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: space.xs,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: c.border,
                    }}
                  >
                    <AppText
                      variant={active ? 'bodyStrong' : 'body'}
                      style={{ color: active ? c.accent : c.text }}
                    >
                      {option.label}
                    </AppText>
                    {active ? <Ionicons name="checkmark" size={18} color={c.accent} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  webWrap: {
    position: 'relative',
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  webChevron: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -8,
  },
  sheetOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    borderWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
    marginTop: spaceTokens.xxs,
  },
});
