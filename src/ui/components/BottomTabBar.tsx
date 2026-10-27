import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useTheme } from '../theme';
import { usePressScale, useReduceMotion } from '../motion/hooks';
import { haptic } from '@/lib/haptics';
import { useUIStore } from '@/lib/ui-store';
import { Sheen } from './Sheen';
import { alpha, lighten } from '../color';
import { duration, fontFaceFor, glow, radius, spring } from '@/ui/tokens';

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

type TabLayout = { x: number; width: number };

/**
 * 4 sekme + merkeze gömülü yakalama butonu.
 * Sekmeler iki çift hâlinde durur, FAB aradaki kapıyı kapatır —
 * havada süzülen bir yapıştırma değil, çubuğun parçası.
 *
 * Aktif sekmeyi gösteren ışık artık statik bir kutu değil: sekmeler
 * arasında yayla kayan tek bir lamba. Hangi sekmede olduğunu söyler,
 * bunun dışında hiçbir şey yapmaz.
 */
export function BottomTabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { c } = useTheme();
  const reduced = useReduceMotion();
  const setCaptureOpen = useUIStore((s) => s.setCaptureOpen);
  const [layouts, setLayouts] = useState<Partial<Record<TabRouteName, TabLayout>>>({});

  const activeName = state.routes[state.index]?.name as TabRouteName | undefined;
  const activeLayout = activeName ? layouts[activeName] : undefined;

  const lampX = useSharedValue(0);
  const lampWidth = useSharedValue(0);
  const lampOpacity = useSharedValue(0);

  useEffect(() => {
    if (!activeLayout) return;
    const targetX = activeLayout.x + 4;
    const targetWidth = Math.max(activeLayout.width - 8, 0);

    if (lampOpacity.get() === 0) {
      // İlk ölçüm: zıplamadan yerine otur.
      lampX.set(targetX);
      lampWidth.set(targetWidth);
      lampOpacity.set(withTiming(1, { duration: duration.fast }));
      return;
    }

    if (reduced) {
      lampX.set(withTiming(targetX, { duration: duration.fast }));
      lampWidth.set(withTiming(targetWidth, { duration: duration.fast }));
    } else {
      lampX.set(withSpring(targetX, spring.settle));
      lampWidth.set(withSpring(targetWidth, spring.settle));
    }
  }, [activeLayout, lampOpacity, lampWidth, lampX, reduced]);

  const lampStyle = useAnimatedStyle(() => ({
    opacity: lampOpacity.get(),
    width: lampWidth.get(),
    transform: [{ translateX: lampX.get() }],
  }));

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
      <View
        key={routeName}
        style={styles.tab}
        onLayout={(event) => {
          const { x, width } = event.nativeEvent.layout;
          setLayouts((prev) => {
            const current = prev[routeName];
            if (current && Math.abs(current.x - x) < 0.5 && Math.abs(current.width - width) < 0.5) {
              return prev;
            }
            return { ...prev, [routeName]: { x, width } };
          });
        }}
      >
        <TabButton
          meta={TAB_META[routeName]}
          active={activeName === routeName}
          onPress={() => goTo(routeName)}
        />
      </View>
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
        <Animated.View
          pointerEvents="none"
          style={[
            styles.lamp,
            glow.soft,
            {
              backgroundColor: c.accentSoft,
              borderColor: alpha(c.accent, 0.35),
              borderRadius: radius.card,
            },
            lampStyle,
          ]}
        />

        {LEFT_ROUTES.map(renderTab)}
        <View style={{ width: CENTER_GAP, alignItems: 'center' }}>
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
  const [hovered, setHovered] = useState(false);
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

  const inactiveColor = hovered ? c.text : c.textMuted;

  const inactiveIconStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [inactiveColor, c.accent]),
  }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  const tabType = type.tab;

  return (
    <Animated.View style={[styles.tabInner, pressStyle]}>
      <Pressable
        {...handlers}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        accessible
        accessibilityRole="link"
        accessibilityLabel={`${meta.label} sekmesi`}
        aria-selected={active}
        aria-current={active ? 'page' : undefined}
        style={[styles.tabPressable, { cursor: 'pointer' }]}
      >
        <Animated.View style={popStyle}>
          <View style={styles.iconWell}>
            <Animated.View style={[StyleSheet.absoluteFill, inactiveIconStyle]}>
              <Ionicons name={meta.icon} size={22} color={inactiveColor} />
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
              fontWeight: active ? '600' : '500',
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
  const { c, dark, radius } = useTheme();
  const { style, handlers } = usePressScale();
  const reduced = useReduceMotion();
  const breath = useSharedValue(0.5);

  useEffect(() => {
    if (reduced) {
      breath.set(0.6);
      return;
    }
    // Nefes: 4 sn'lik çok yavaş bir parlaklık. Dikkat çekmez, canlı tutar.
    breath.set(withRepeat(withTiming(0.9, { duration: 2600 }), -1, true));
  }, [breath, reduced]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.get(), [0.5, 0.9], [0.5, 0.95]),
    transform: [{ scale: 1 + breath.get() * 0.08 }],
  }));

  return (
    <Animated.View style={[styles.fab, style]}>
      {/* Tek, bulanık ışık: metalin çevresine vuran sıcak hâle. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fabHalo,
          { backgroundColor: alpha(c.accent, dark ? 0.28 : 0.16), borderRadius: radius.pill },
          haloStyle,
        ]}
      />

      <Pressable
        {...handlers}
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Yeni görev, not veya fikir ekle"
        style={[
          styles.fabPressable,
          {
            backgroundColor: c.accent,
            borderRadius: radius.pill,
            cursor: 'pointer',
          },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[lighten(c.accent, 0.22), c.accent]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Sheen color={c.sheen} intensity={0.35} durationMs={1500} delayMs={1800} />
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
  lamp: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
  },
  tabInner: {
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
    // Yuvarlak gölge: kutu kare kaldığı sürece web'de gölge de kare çizilir.
    borderRadius: FAB_SIZE / 2,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabHalo: {
    position: 'absolute',
    width: FAB_SIZE + 24,
    height: FAB_SIZE + 24,
    filter: 'blur(10px)',
  },
  fabPressable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
