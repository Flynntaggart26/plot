import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useUIStore } from './ui-store';

/** Yakalama sheet'inin altında gösterilen kısayol listesi (yalnızca web). */
export const SHORTCUT_HINTS = [
  { key: 'N', label: 'Not' },
  { key: 'I', label: 'Fikir' },
  { key: 'T', label: 'Görev' },
  { key: 'C', label: 'Yakala' },
] as const;

/**
 * Masaüstü klavye kısayolları.
 *
 * Tek harfli kısayollar yalnızca odak bir metin alanında değilken çalışır;
 * yazarken "n" harfi not açmaz. ⌘/Ctrl+K her yerden yakalamayı açar.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const setCaptureOpen = useUIStore((state) => state.setCaptureOpen);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;

      const target = event.target as HTMLElement | null;
      const typing =
        Boolean(target) &&
        (target!.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target!.tagName));

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCaptureOpen(true);
        return;
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key.toLowerCase()) {
        case 'n':
          setCaptureOpen(false);
          router.push('/note/new');
          break;
        case 'i':
          setCaptureOpen(false);
          router.push('/tangent/new');
          break;
        case 't':
          setCaptureOpen(false);
          router.push('/task/new');
          break;
        case 'c':
          setCaptureOpen(true);
          break;
        default:
          return;
      }

      event.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, setCaptureOpen]);
}
