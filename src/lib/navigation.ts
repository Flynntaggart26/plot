import { router } from 'expo-router';

/**
 * Formu kapatmanın güvenli yolu.
 *
 * Derin bağlantı veya soğuk açılışta geri gidilecek bir ekran olmayabilir;
 * `router.back()` o durumda sessizce hiçbir şey yapmaz ve kullanıcı
 * kaydettikten sonra formda kalır. Geçmiş varsa geri dön, yoksa Today'e çık.
 */
export function dismissToRoot() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
