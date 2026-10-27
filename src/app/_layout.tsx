import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, isAppearanceForcedByUrl, setAppearance, useTheme } from '@/ui/theme';
import { BootScreen } from '@/ui/components/BootScreen';
import { StartupError } from '@/ui/components/StartupError';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../../drizzle/migrations';
import { initDatabase, type AppDatabase } from '@/db/client';
import { seedDatabase } from '@/db/seed';
import { getAppearanceSetting } from '@/features/settings/preferences';
import { duration } from '@/ui/tokens';

// Fontlar ve veritabanı hazır olana kadar native splash ekranı kalsın.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: duration.in, fade: true });

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
});

/**
 * Kök kabuk: sağlayıcılar + yığın.
 * Tüm ekranlar buradaki Stack'ten geçer; sekmeler ilk Stack.Screen'dir.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <DatabaseGate />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Açılış sırası: veritabanı → migration → seed.
 * Veritabanı async açılır (web'de wa-sqlite worker'ı hazırlansın diye);
 * bu yüzden migration kancası ancak bağlantı hazır olunca mount edilir.
 */
function DatabaseGate() {
  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    initDatabase()
      .then((opened) => {
        if (!cancelled) setDatabase(opened);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setInitError(cause instanceof Error ? cause.message : String(cause));
        void SplashScreen.hideAsync().catch(() => undefined);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (initError) {
    return <StartupError message={initError} />;
  }

  if (!database) {
    return <BootScreen />;
  }

  return <MigratingStack database={database} />;
}

function MigratingStack({ database }: { database: AppDatabase }) {
  const { c, dark, fontReady } = useTheme();
  const migration = useMigrations(database, migrations);
  const seeded = useRef(false);
  const appearanceHydrated = useRef(false);
  const [appearanceReady, setAppearanceReady] = useState(false);

  // Tohumlama migration'dan sonra, bir kez. Idempotent olduğu için
  // StrictMode'un çift çalıştırması da zararsızdır. Boot'u bloklamaz:
  // Inbox kaydı görev oluştururken de garanti edilir.
  useEffect(() => {
    if (!migration.success || seeded.current) return;
    seeded.current = true;
    try {
      seedDatabase();
    } catch (cause) {
      console.warn('Seed başarısız:', cause);
    }
  }, [migration.success]);

  // Kayıtlı tema tercihini ilk kareden önce uygula: aksi halde koyu tema
  // seçmiş kullanıcı bir an varsayılan temayı görür.
  useEffect(() => {
    if (!migration.success || appearanceHydrated.current) return;
    appearanceHydrated.current = true;

    if (!isAppearanceForcedByUrl()) {
      try {
        const stored = getAppearanceSetting();
        if (stored) setAppearance(stored);
      } catch (cause) {
        console.warn('Görünüm tercihi okunamadı:', cause);
      }
    }

    setAppearanceReady(true);
  }, [migration.success]);

  const ready = fontReady && migration.success && appearanceReady;
  const failed = Boolean(migration.error);

  useEffect(() => {
    if (ready || failed) {
      // Splash'ten içeriğe geçiş: tek, kısa fade. Hata olsa da devam et.
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready, failed]);

  if (failed) {
    return <StartupError message={migration.error?.message} />;
  }

  if (!ready) {
    return <BootScreen />;
  }

  return (
    <>
      {/* İlk kare: splash'ten sonra içerik belirginleşerek gelsin. */}
      <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(duration.in)}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="plan/index" />
          <Stack.Screen name="muse/index" />
          <Stack.Screen name="note/[id]" />
          <Stack.Screen name="note/new" />
          <Stack.Screen name="task/new" />
          <Stack.Screen name="task/[id]" />
          <Stack.Screen name="tangent/[id]" />
          <Stack.Screen name="tangent/new" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="settings/ai" />
          <Stack.Screen name="settings/appearance" />
          <Stack.Screen name="settings/data" />
        </Stack>
      </Animated.View>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </>
  );
}
