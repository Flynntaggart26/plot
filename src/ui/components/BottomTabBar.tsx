import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useTheme } from '../theme';
import { usePressScale, useReduceMotion } from '../motion/hooks';
import { haptic } from '@/lib/haptics';
import { useUIStore } from '@/lib/ui-store';
import { duration, fontFaceFor, spring } from '@/ui/tokens';

const FAB_SIZE = 56;
/** Kısa ekranlarda FAB boşluğunu daralt; çubuk rozet büyüklüğünü korur. */
const SHORT_SCREEN = Dimensions.get('window').height < 700;
/** Merkez kapısı: FAB'ın oturduğu boşluk (FAB genişliği + nefes payı) */
const CENTER_GAP = SHORT_SCREEN ? 96 : 120;

/**
 * Sekme kimliği rota adına bağlıdır, sıraya değil: ekran sırası değişse bile
 * etiket ve ikonlar kaymaz.
 */
const TAB_META = {
  index: { icon: 'calendar-outline', focusedIcon: 'calendar', label: 'Today' },
  focus: { icon: 'aperture-outline', focusedIcon: 'aperture', label: 'Focus' },
  notes: { icon: 'document-text-outline', focusedIcon: 'document-text', label: 'Notes' },
  tangent: { icon: 'bulb-outline', focusedIcon: 'bulb', label: 'Tangent' },
} as const;

type TabRouteName = keyof typeof TAB_META;
type TabMeta = (typeof TAB_META)[TabRouteName];

const LEFT_ROUTES: TabRouteName[] = ['index', 'focus'];
const RIGHT_ROUTES: TabRouteName[] = ['notes', 'tangent'];

/**
 * 4 sekme + merkeze gömülü yakalama butonu.
 * Sekmeler iki çift hâlinde durur, FAB aradaki kapıyı kapatır —
 * havada süzülen bir yapıştırma değil, çubuğun parçası.
 */
export function BottomTabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { c } = useTheme();
  const setCaptureOpen = useUIStore((s) => s.setCaptureOpen);

  const goTo = (routeName: TabRouteName) => {
    const target = state.routes.find((route) => route.name === routeName);
    if (!target) return;
    haptic('tick');
    navigateToTab(target.key);
  };

  const renderTab = (routeName: TabRouteName) => {
    const target = state.routes.find((route) => route.name === routeName);
    if (!target) return null;
    return (
      <TabButton
        key={routeName}
        meta={TAB_META[routeName]}
        active={state.routes[state.index]?.name === routeName}
        onPress={() => goTo(routeName)}
      />
    );
  };

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.row}>
        {LEFT_ROUTES.map(renderTab)}
        <View style={{ width: CENTER_GAP }}>
          <Fab
            onPress={() => {
              haptic('medium');
              setCaptureOpen(true);
            }}
          />
        </View>
        {RIGHT_ROUTES.map(renderTab)}
      </View>
    </View>
  );
}

function TabButton({
  meta,
  active,
  onPress,
}: {
  meta: TabMeta;
  active: boolean;
  onPress: () => void;
}) {
  const { c, type } = useTheme();
  const reduced = useReduceMotion();
  const { style: pressStyle, handlers } = usePressScale();
  const progress = useSharedValue(active ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, { duration: reduced ? duration.fast : duration.out }));

    if (active && !reduced) {
      // Aktivasyon onayı: tek, kısa bir sıçrama. Bilgi taşıyor (hangi sekme).
      pop.set(withSequence(withSpring(1.08, spring.snappy), withSpring(1, spring.snappy)));
    } else {
      pop.set(1);
    }
  }, [active, pop, progress, reduced]);

  const inactiveIconStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [c.textMuted, c.accent]),
  }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  const tabType = type.tab;

  return (
    <Animated.View style={[styles.tab, pressStyle]}>
      <Pressable
        {...handlers}
        onPress={onPress}
        accessible
        accessibilityRole="link"
        accessibilityLabel={`${meta.label} sekmesi`}
        aria-selected={active}
        aria-current={active ? 'page' : undefined}
        style={styles.tabPressable}
      >
        <Animated.View style={popStyle}>
          <View style={styles.iconWell}>
            <Animated.View style={[StyleSheet.absoluteFill, inactiveIconStyle]}>
              <Ionicons name={meta.icon} size={22} color={c.textMuted} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, activeIconStyle]}>
              <Ionicons name={meta.focusedIcon} size={22} color={c.accent} />
            </Animated.View>
          </View>
        </Animated.View>
        <Animated.Text
          style={[
            {
              fontFamily: fontFaceFor(tabType),
              fontSize: tabType.size,
              lineHeight: tabType.lineHeight,
              letterSpacing: tabType.letterSpacing,
            },
            labelStyle,
          ]}
        >
          {meta.label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

function Fab({ onPress }: { onPress: () => void }) {
  const { c, radius } = useTheme();
  const { style, handlers } = usePressScale();

  return (
    <Animated.View
      style={[styles.fab, style, { backgroundColor: c.accent, borderRadius: radius.pill }]}
    >
      <Pressable
        {...handlers}
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Yeni görev, not veya fikir ekle"
        style={styles.fabPressable}
      >
        <Ionicons name="add" size={26} color={c.bg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    flex: 1,
  },
  tabPressable: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 10,
    paddingBottom: 5,
  },
  iconWell: {
    width: 22,
    height: 22,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -FAB_SIZE / 2.6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
