import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { color, type as typeTokens, space, radius, type ColorTokens } from './tokens';

export type AppearanceMode = 'system' | 'dark' | 'light';

export type Theme = {
  c: ColorTokens;
  type: typeof typeTokens;
  space: typeof space;
  radius: typeof radius;
  dark: boolean;
  /** Fontlar yüklendi ya da yüklenemedi: artık içerik gösterilebilir. */
  fontReady: boolean;
};

const ThemeContext = createContext<Theme | null>(null);

// Tercih SQLite'taki `appearance_mode` anahtarından yüklenir (bkz. _layout).
let appearanceOverride: AppearanceMode = 'system';

/**
 * Web hata ayıklama kancası: `?theme=light|dark` ile temayı sabitler.
 * Yalnızca web'de ve URL'de parametre varsa devreye girer; native'i etkilemez.
 */
let appearanceForcedByUrl = false;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const param = new URLSearchParams(window.location.search).get('theme');
  if (param === 'light' || param === 'dark') {
    appearanceOverride = param;
    appearanceForcedByUrl = true;
  }
}

const appearanceListeners = new Set<() => void>();

export function setAppearance(mode: AppearanceMode) {
  appearanceOverride = mode;
  for (const listener of appearanceListeners) listener();
}

export function getAppearance(): AppearanceMode {
  return appearanceOverride;
}

/** URL'deki `?theme=` hata ayıklama kilidi aktif mi? (kalıcı tercih ezilmesin) */
export function isAppearanceForcedByUrl(): boolean {
  return appearanceForcedByUrl;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [, forceRender] = useState(0);
  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    InstrumentSerif_400Regular,
  });

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    appearanceListeners.add(listener);
    return () => {
      appearanceListeners.delete(listener);
    };
  }, []);

  // Font yüklenemezse sonsuza kadar boot ekranında kalmak yerine sistem
  // fontlarıyla devam et: içerik her zaman görünür kalmalı.
  const fontReady = fontsLoaded || Boolean(fontError);

  const dark =
    appearanceOverride === 'system' ? systemScheme !== 'light' : appearanceOverride === 'dark';

  const value = useMemo<Theme>(
    () => ({
      c: dark ? color.dark : color.light,
      type: typeTokens,
      space,
      radius,
      dark,
      fontReady,
    }),
    [dark, fontReady],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme, ThemeProvider dışında kullanıldı');
  }
  return ctx;
}
