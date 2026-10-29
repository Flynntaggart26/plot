import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useTheme } from '@/ui/theme';
import { BottomTabBar } from '@/ui/components/BottomTabBar';

/**
 * 4 sekme en fazla: Today, Focus, Notes, Tangent.
 * Plan ve You ikincil seviyede; üstlerinden erişilir.
 * Özel tab bar, merkeze FAB'ı yerleştirir. Yakalama sheet'i kök düzende
 * barınır: masaüstü global kısayolu her ekrandan açabilsin.
 */
export default function TabsLayout() {
  const { c } = useTheme();

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
    </View>
  );
}
