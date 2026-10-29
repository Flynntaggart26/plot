import { Platform } from 'react-native';

/**
 * Dosya alışverişi.
 *
 * Masaüstünde (Tauri) yerel kaydetme/açma penceresi kullanılır; tarayıcıda
 * aynı akış Blob indirmesi ve `<input type="file">` ile taklit edilir.
 * Uygulamanın geri kalanı hangi platformda olduğunu bilmek zorunda kalmaz.
 */

const TAURI_KEY = '__TAURI_INTERNALS__';

export function isTauriRuntime(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  return TAURI_KEY in window;
}

export type SaveResult = { saved: boolean; path?: string };

export async function saveTextFile(input: {
  defaultName: string;
  contents: string;
  extension: string;
  description: string;
  mimeType?: string;
}): Promise<SaveResult> {
  if (isTauriRuntime()) {
    const [{ save }, { invoke }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/api/core'),
    ]);

    const path = await save({
      defaultPath: input.defaultName,
      filters: [{ name: input.description, extensions: [input.extension] }],
    });

    if (!path) return { saved: false };
    await invoke('write_text_file', { path, contents: input.contents });
    return { saved: true, path };
  }

  if (typeof document === 'undefined') {
    throw new Error('Dosya indirme bu ortamda desteklenmiyor.');
  }

  const blob = new Blob([input.contents], {
    type: input.mimeType ?? 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = input.defaultName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { saved: true };
}

export async function pickTextFile(input: {
  extensions: string[];
  description: string;
}): Promise<{ contents: string; name: string } | null> {
  if (isTauriRuntime()) {
    const [{ open }, { invoke }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/api/core'),
    ]);

    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: input.description, extensions: input.extensions }],
    });

    if (!selected || Array.isArray(selected)) return null;
    const contents = await invoke<string>('read_text_file', { path: selected });
    const name = selected.split(/[\\/]/).pop() ?? selected;
    return { contents, name };
  }

  if (typeof document === 'undefined') return null;

  return new Promise((resolve, reject) => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = input.extensions.map((extension) => `.${extension}`).join(',');
    picker.style.display = 'none';

    picker.onchange = () => {
      const file = picker.files?.[0];
      picker.remove();
      if (!file) {
        resolve(null);
        return;
      }
      file
        .text()
        .then((contents) => resolve({ contents, name: file.name }))
        .catch(reject);
    };

    document.body.appendChild(picker);
    picker.click();
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === 'undefined') return false;

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', 'true');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok;
}
