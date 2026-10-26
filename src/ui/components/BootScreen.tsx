import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';

/**
 * Fontlar yüklenene dek gösterilen boş boot ekranı.
 * Hedef: kısa, sessiz, zemini içinde renkte.
 */
export function BootScreen() {
  const { c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.bg }} />;
}

export const ScreenHeaderless = BootScreen;
