import * as H from 'expo-haptics';
import type { HapticStrength } from '@/ui/tokens';

/**
 * Haptik dilin tek kapısı. Anlamlar:
 * - tick:      hafif seçim (chip, sekme)
 * - light:     kart basma, genel dokunuş
 * - medium:    açılışlar, bottom sheet
 * - success:   görev tamamlama, kaydetme
 * Yoğunluk token'dan gelmez; anlamdan gelir. Kaba dokunuş yok.
 */
export function haptic(strength: HapticStrength) {
  switch (strength) {
    case 'tick':
      H.selectionAsync();
      break;
    case 'light':
      H.impactAsync(H.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      H.impactAsync(H.ImpactFeedbackStyle.Medium);
      break;
    case 'success':
      H.notificationAsync(H.NotificationFeedbackType.Success);
      break;
  }
}
