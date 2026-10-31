import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import Animated from 'react-native-reanimated';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { alpha } from '@/ui/color';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';
import { usePressScale } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

/**
 * Sürüm `app.json`'dan gelir; elle yazılan bir sayı er geç gerçeği
 * yansıtmaz ve kullanıcı hangi sürümde olduğunu bilemez.
 */
const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** Masaüstte (Tauri) otomatik güncelleme denetlemesi; web/mobilde kapalı. */
const IS_TAURI = Platform.OS !== 'web' && Platform.OS !== 'ios' && Platform.OS !== 'android';

/**
 * Ayarlar — tercihlerin ve bakım ekranlarının tek giriş noktası.
 * Today ekranındaki dişli buradan açılır; her satır kendi alt ekranına gider.
 */
export default function SettingsScreen() {
  const { c, space } = useTheme();
  const [updateAvailable, setUpdateAvailable] = useState<{
    version: string;
    notes: string;
    downloadUrl: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  // Güncelleme mevcut olduğunda Rust'tan gelen olayı dinle.
  useEffect(() => {
    if (!IS_TAURI) return undefined;
    const unlisten = listen<{ version: string; notes?: string; download_url: string }>('plot:update-available', (event) => {
      try {
        const payload = event.payload;
        setUpdateAvailable({
          version: payload.version,
          notes: payload.notes ?? '',
          downloadUrl: payload.download_url,
        });
        toast(`Yeni sürüm mevcut: ${payload.version}`, 'info');
      } catch {
        // Geçersiz yük.
      }
    });
    return () => {
      void unlisten.then((fn: () => void) => fn());
    };
  }, []);

  const checkUpdate = useCallback(async () => {
    if (!IS_TAURI) return;
    setChecking(true);
    try {
      const found = await invoke<boolean>('check_for_update');
      if (!found) {
        toast('Güncelleme yok. En güncel sürümü kullanıyorsunuz.', 'success');
      }
    } catch {
      toast('Güncelleme denetlenemedi. İnternet bağlantınızı kontrol edin.', 'error');
    } finally {
      setChecking(false);
    }
  }, []);

  const doInstall = useCallback(async () => {
    if (!IS_TAURI || !updateAvailable) return;
    try {
      await invoke<void>('install_update');
    } catch {
      toast('Güncelleme kurulamadı. Lütfen tekrar deneyin.', 'error');
    }
  }, [updateAvailable]);

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
        <View style={[styles.group]}>
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

        {IS_TAURI && (
          <View style={[styles.group]}>
            <Pressable
              onPress={checkUpdate}
              disabled={checking}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Güncellemeleri denetle"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                paddingHorizontal: space.md,
                paddingVertical: space.md,
                minHeight: 68,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: c.border,
                opacity: checking ? 0.6 : 1,
                cursor: checking ? 'auto' : 'pointer',
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
                <Ionicons
                  name={checking ? 'refresh-outline' : 'cloud-download-outline'}
                  size={18}
                  color={c.accent}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="body" style={{ color: c.text }}>
                  Güncellemeleri Denetle
                </AppText>
                <AppText variant="meta" muted>
                  {checking ? 'Denetleniyor…' : 'Masaüstü uygulamasını güncelleyin'}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
            </Pressable>

            {updateAvailable && (
              <Pressable
                onPress={doInstall}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Sürüm ${updateAvailable.version}'ı yükle`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  paddingHorizontal: space.md,
                  paddingVertical: space.md,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: c.border,
                  backgroundColor: alpha(c.accent, 0.1),
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: c.accent,
                  }}
                >
                  <Ionicons name="arrow-down-circle" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyStrong" style={{ color: c.accent }}>
                    Sürüm {updateAvailable.version} İndir
                  </AppText>
                  <AppText variant="meta" muted>
                    Uygulama kapatılarak güncellenecek; verileriniz silinmez.
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.accent} />
              </Pressable>
            )}
          </View>
        )}

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
