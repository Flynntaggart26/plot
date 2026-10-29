import { useEffect } from 'react';
import { useUIStore } from './ui-store';

/**
 * Masaüstü global kısayolu (`Ctrl+Shift+Space`) dinler.
 *
 * Kısayol Rust tarafında kayıtlı: pencere arka plandayken bile çalışır,
 * pencereyi öne getirir ve `plot:quick-capture` olayını yayar. Burada
 * yalnızca olayı yakalama sheet'ine bağlarız. Tarayıcıda Tauri API'si
 * yoktur; bu yüzden dinamik import ve sessiz çıkış.
 */
export function useQuickCapture() {
  const setCaptureOpen = useUIStore((state) => state.setCaptureOpen);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const internals = (globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
      if (!internals) return;

      try {
        const { listen } = await import('@tauri-apps/api/event');
        const off = await listen('plot:quick-capture', () => {
          setCaptureOpen(true);
        });

        if (cancelled) {
          off();
        } else {
          unlisten = off;
        }
      } catch (cause) {
        console.warn('Hızlı yakalama kısayolu dinlenemedi:', cause);
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [setCaptureOpen]);
}
