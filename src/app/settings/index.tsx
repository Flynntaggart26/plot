import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import Animated from 'react-native-reanimated';
import { isTauriRuntime } from '@/lib/file-transfer';
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

/**
 * Masaüstü (Tauri) tespiti `isTauriRuntime()` ile yapılır.
 *
 * `Platform.OS` bu uygulamada masaüstünde de 'web' döner: Tauri, Expo'nun
 * web çıktısını (react-native-web) yükler. Bu yüzden `Platform.OS !== 'web'`
 * kontrolü masaüstünde daima false olur ve güncelleme arayüzü hiç görünmez.
 */

/** Rust tarafındaki `UpdateInfo` ile aynı alanlar (camelCase). */
type UpdateInfo = {
  version: string;
  notes: string | null;
  downloadUrl: string;
};

type UpdateProgress = {
  downloaded: number;
  total: number | null;
};

/**
 * Ayarlar — tercihlerin ve bakım ekranlarının tek giriş noktası.
 * Today ekranındaki dişli buradan açılır; her satır kendi alt ekranına gider.
 */
export default function SettingsScreen() {
  const { c, space } = useTheme();
  const isDesktop = isTauriRuntime();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);

  /**
   * `silent` — uygulama açılışında yapılan denetim. O durumda kullanıcıyı
   * "güncelleme yok" bildirimiyle rahatsız etmiyoruz; yalnızca yeni sürüm
   * bulunduğunda haber veriyoruz.
   */
  const runCheck = useCallback(async (silent: boolean) => {
    if (!isTauriRuntime()) return;
    setChecking(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const found = await invoke<UpdateInfo | null>('check_for_update');
      if (found) {
        setUpdate(found);
        toast(`Yeni sürüm hazır: ${found.version}`, 'info');
      } else if (!silent) {
        toast('Güncelleme yok. En güncel sürümü kullanıyorsunuz.', 'success');
      }
    } catch {
      if (!silent) {
        toast('Güncelleme denetlenemedi. İnternet bağlantınızı kontrol edin.', 'error');
      }
    } finally {
      setChecking(false);
    }
  }, []);

  // Açılışta sessiz denetim: yeni sürüm varsa satır kendiliğinden görünür.
  // Ekran oturduktan sonra çalışsın diye 400 ms geciktirilir; ağ isteği
  // ilk kareyle yarışmaz.
  useEffect(() => {
    const timer = setTimeout(() => {
      void runCheck(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [runCheck]);

  // İndirme yüzdesi Rust'tan olay olarak gelir.
  useEffect(() => {
    if (!isTauriRuntime()) return undefined;

    let dispose: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<UpdateProgress>('plot:update-progress', (event) => {
        const { downloaded, total } = event.payload;
        setPercent(total ? Math.min(100, Math.round((downloaded / total) * 100)) : null);
      });
      if (cancelled) unlisten();
      else dispose = unlisten;
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  const install = useCallback(async () => {
    if (!isTauriRuntime() || !update) return;
    setInstalling(true);
    setPercent(null);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke<void>('install_update');
      // Başarılıysa Windows kurulumu uygulamayı kapatır; buraya dönülmez.
    } catch {
      setInstalling(false);
      setPercent(null);
      toast('Güncelleme kurulamadı. Lütfen tekrar deneyin.', 'error');
    }
  }, [update]);

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

        {isDesktop && (
          <View style={[styles.group]}>
            <Pressable
              onPress={() => void runCheck(false)}
              disabled={checking || installing}
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
                <Ionicons name="refresh-outline" size={18} color={c.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="body" style={{ color: c.text }}>
                  Güncellemeleri Denetle
                </AppText>
                <AppText variant="meta" muted>
                  {checking ? 'Denetleniyor…' : `Şu anki sürüm ${APP_VERSION}`}
                </AppText>
              </View>
              {checking ? (
                <Ionicons name="hourglass-outline" size={18} color={c.textFaint} />
              ) : null}
            </Pressable>

            {update && (
              <Pressable
                onPress={install}
                disabled={installing}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Sürüm ${update.version} güncellemesini kur`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  paddingHorizontal: space.md,
                  paddingVertical: space.md,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: c.border,
                  backgroundColor: alpha(c.accent, 0.1),
                  cursor: installing ? 'auto' : 'pointer',
                  opacity: installing ? 0.7 : 1,
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
                  <Ionicons
                    name={installing ? 'cloud-download-outline' : 'arrow-down-circle'}
                    size={18}
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyStrong" style={{ color: c.accent }}>
                    {installing
                      ? percent === null
                        ? 'İndiriliyor…'
                        : `İndiriliyor… %${percent}`
                      : `Sürüm ${update.version} Güncelle`}
                  </AppText>
                  <AppText variant="meta" muted numberOfLines={2}>
                    {installing
                      ? 'İndirme bitince kurulum açılır; verileriniz silinmez.'
                      : (update.notes?.trim() || 'Uygulama yeniden başlayacak; verileriniz silinmez.')}
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
