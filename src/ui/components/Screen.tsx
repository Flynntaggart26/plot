import React from 'react';
import { StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { fontFaceFor, type TypeName, type TypeRole } from '../tokens';

/**
 * Her ekranın dış kabuğu: arka plan, güvenli alan, tutarlı kenar boşluğu.
 *
 * Üst inset her zaman uygulanır (Android edge-to-edge'de başlık durum
 * çubuğunun altında kalmasın). Alt inset varsayılan olarak uygulanmaz:
 * sekme ekranlarında alt çubuğun kendisi inset'i yönetir, iki kez eklenirse
 * içerik gereksiz yükselir. Sekme dışı bir ekran bu kabuğu kullanırsa
 * `bottomInset` verilir.
 */
export function Screen({
  children,
  inset = true,
  bottomInset = false,
  style,
  contentStyle,
}: {
  children?: React.ReactNode;
  /** false: yatay boşlukları kendin yönet (tam genişlik içerikler için) */
  inset?: boolean;
  /** true: alt güvenli alanı da ekle (sekme dışı ekranlar) */
  bottomInset?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + space.xs,
            paddingHorizontal: inset ? space.lg : 0,
            paddingBottom: bottomInset ? insets.bottom + space.xs : space.xs,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Ekran girişi: üst etiket (tarih, "NOW" gibi), serif başlık, tek satır alt metin.
 * Dört sekme de bunu kullanır; başlık sistemi tek yerde yaşar.
 */
export function ScreenIntro({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Sağ üstteki kısayol düğmeleri (ör. takvim, ayarlar). */
  action?: React.ReactNode;
}) {
  const { space } = useTheme();
  const text = (
    <>
      {eyebrow ? (
        <AppText variant="meta" muted style={{ letterSpacing: 1.2 }}>
          {eyebrow}
        </AppText>
      ) : null}
      <AppText variant="display">{title}</AppText>
      {subtitle ? (
        <AppText variant="body" muted>
          {subtitle}
        </AppText>
      ) : null}
    </>
  );

  if (!action) {
    return (
      <View style={{ marginTop: space.sm, gap: space.xxs }}>{text}</View>
    );
  }

  return (
    <View
      style={{
        marginTop: space.sm,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.sm,
      }}
    >
      <View style={{ flex: 1, gap: space.xxs }}>{text}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
        {action}
      </View>
    </View>
  );
}

/**
 * Rollerden metin. `variant` yalnızca tokens.type'ta tanımlı anahtarları kabul eder.
 *
 * Ağırlık, `fontWeight` ile değil doğru font dosyasıyla uygulanır: Android'de
 * özel aileler için fontWeight sentetik kalınlık üretmez, bu yüzden 300/500/600
 * ağırlıklar ayrı yüklenen Inter dosyalarından gelir.
 */
export function AppText({
  variant = 'body',
  muted,
  faint,
  style,
  children,
  ...rest
}: TextProps & { variant?: TypeName; muted?: boolean; faint?: boolean }) {
  const { c, type } = useTheme();
  const role: TypeRole = type[variant];
  const color = faint ? c.textFaint : muted ? c.textMuted : c.text;

  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fontFaceFor(role),
          fontSize: role.size,
          lineHeight: role.lineHeight,
          letterSpacing: role.letterSpacing,
          color,
          fontVariant: role.tabular ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
