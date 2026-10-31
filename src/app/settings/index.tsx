import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import Animated from 'react-native-reanimated';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';
import { usePressScale } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';

/**
 * Sürüm `app.json`'dan gelir; elle yazılan bir sayı er geç gerçeği
 * yansıtmaz ve kullanıcı hangi sürümde olduğunu bilemez.
 */
const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/**
 * Ayarlar — tercihlerin ve bakım ekranlarının tek giriş noktası.
 * Today ekranındaki dişli buradan açılır; her satır kendi alt ekranına gider.
 */
export default function SettingsScreen() {
  const { c, space, radius } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Ayarlar" subtitle="Tercihler ve veri" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.xxl,
          gap: space.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.group,
            { backgroundColor: c.surface, borderRadius: radius.card, borderColor: c.border },
          ]}
        >
          <SettingsRow
            icon="contrast-outline"
            title="Görünüm"
            hint="Sistem, açık veya koyu tema"
            href="/settings/appearance"
            first
          />
          <SettingsRow
            icon="sparkles-outline"
            title="Muse"
            hint="AI asistanının durumu ve sohbet geçmişi"
            href="/settings/ai"
          />
          <SettingsRow
            icon="cloud-download-outline"
            title="Veri ve Yedekleme"
            hint="JSON / Markdown dışa ve içe aktarma"
            href="/settings/data"
          />
        </View>

        <View style={{ gap: 2, paddingHorizontal: space.xxs }}>
          <AppText variant="meta" faint>
            Plot {APP_VERSION}
          </AppText>
          <AppText variant="meta" faint>
            Tüm veriler cihazında kalır. Hesap yok, bulut yok.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  hint,
  href,
  first = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  hint: string;
  href: '/settings/appearance' | '/settings/ai' | '/settings/data';
  first?: boolean;
}) {
  const { c, space } = useTheme();
  const router = useRouter();
  const press = usePressScale();

  return (
    <Animated.View style={press.style}>
      <Pressable
        {...press.handlers}
        onPress={() => {
          haptic('tick');
          router.push(href);
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${hint}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingHorizontal: space.md,
          paddingVertical: space.md,
          minHeight: 68,
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: c.border,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.surfaceRaised,
          }}
        >
          <Ionicons name={icon} size={18} color={c.accent} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" style={{ color: c.text }}>
            {title}
          </AppText>
          <AppText variant="meta" muted>
            {hint}
          </AppText>
        </View>

        <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
