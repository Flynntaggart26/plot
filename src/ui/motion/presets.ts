import type { WithSpringConfig } from 'react-native-reanimated';
import { spring } from '../tokens';

/**
 * Hareket dili — iki çeşit: yaylı (dokunma, sürükleme, giriş) ve zamanlı (çıkış, scrim).
 * Zamanlama değerleri tokens.duration'da; burada yalnızca yay seçimi çözülür.
 *
 * @example
 * const config = springConfig('gentle', reduceMotion);
 * animation = withSpring(0, config);
 */
export type SpringName = keyof typeof spring;

export function springConfig(name: SpringName, reduceMotion: boolean): WithSpringConfig {
  if (reduceMotion) return { damping: 99, stiffness: 999, mass: 0.01 };
  return spring[name] as WithSpringConfig;
}
