import { useCallback, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { springConfig } from './presets';

/**
 * "reduce motion" erişilebilirlik tercihi.
 *
 * Harici bir store olarak tutulur: dinleyici tek, tüm bileşenler aynı
 * modül-seviyesi aboneliği paylaşır. (Her basılabilir öğe kendi
 * AccessibilityInfo aboneliğini açsaydı onlarca gereksiz native dinleyici
 * oluşurdu.) `useSyncExternalStore`, effect içinde setState çağırmadan
 * güncel değeri okur.
 */
let cachedReduced = false;
let subscription: { remove(): void } | null = null;
const listeners = new Set<() => void>();

function publish(value: boolean) {
  if (cachedReduced === value) return;
  cachedReduced = value;
  for (const listener of listeners) listener();
}

function ensureSubscription() {
  if (subscription) return;
  void AccessibilityInfo.isReduceMotionEnabled().then(publish);
  subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
}

function subscribe(listener: () => void) {
  ensureSubscription();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return cachedReduced;
}

function getServerSnapshot() {
  return false;
}

export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Basılı öğeler için ortak mikro-etkileşim:
 * basınca %0.96'ya söner, bırakınca yayla geri döner.
 * Tüm basılabilir bileşenler bunu kullanırsa uygulama tek hissli kalır.
 * React Compiler uyumu için shared value'lara yalnızca .get()/.set() ile erişilir.
 *
 * @example
 * const { style, handlers } = usePressScale(disabled);
 * <Animated.View style={style}><Pressable {...handlers} onPress={...} /></Animated.View>
 */
export function usePressScale(disabled = false, pressedScale = 0.96) {
  const reduced = useReduceMotion();
  const config = springConfig('snappy', reduced);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: opacity.get(),
  }));

  const onPressIn = useCallback(() => {
    if (reduced) {
      opacity.set(withTiming(0.6, { duration: 120 }));
    } else {
      scale.set(withSpring(pressedScale, config));
    }
  }, [config, opacity, reduced, pressedScale, scale]);

  const onPressOut = useCallback(() => {
    if (reduced) {
      opacity.set(withTiming(1, { duration: 120 }));
    } else {
      scale.set(withSpring(1, config));
      opacity.set(withTiming(1, { duration: 120 }));
    }
  }, [config, opacity, reduced, scale]);

  const handlers = disabled ? {} : { onPressIn, onPressOut };

  return { style, handlers };
}
