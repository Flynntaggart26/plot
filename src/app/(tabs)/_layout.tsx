import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useTheme } from '@/ui/theme';
import { BottomTabBar } from '@/ui/components/BottomTabBar';
import { CaptureSheet } from '@/ui/components/CaptureSheet';
import { useUIStore } from '@/lib/ui-store';

/**
 * 4 sekme en fazla: Today, Focus, Notes, Tangent.
 * Plan ve You ikincil seviyede; üstlerinden erişilir.
 * Özel tab bar, merkeze FAB'ı yerleştirir; yakalama sheet'i burada barındırılır.
 */
export default function TabsLayout() {
  const { c } = useTheme();
  const captureOpen = useUIStore((s) => s.captureOpen);
  const setCaptureOpen = useUIStore((s) => s.setCaptureOpen);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: c.bg },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="focus" />
        <Tabs.Screen name="notes" />
        <Tabs.Screen name="tangent" />
      </Tabs>
      <CaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </View>
  );
}
