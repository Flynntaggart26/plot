import { Platform } from 'react-native';

/**
 * Ses kaydının kalıcı hâli.
 *
 * Masaüstü ve mobilde kayıt doğrudan belge klasörüne yazılır; dönen `file://`
 * yolu veritabanına olduğu gibi kaydedilir. Tarayıcıda ise `expo-audio` bir
 * blob URL üretir ve blob URL'ler sayfa kapanınca ölür. Bu yüzden web'de kayıt
 * data URI'ye çevrilir: tek dosyada yaşar, yedeklemeyle taşınır.
 */

const DATA_URI = 'data:';

export function isInlineAudio(path: string | null | undefined): boolean {
  return Boolean(path?.startsWith(DATA_URI));
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Kayıt okunamadı.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Kayıt okunamadı.'));
    };
    reader.readAsDataURL(blob);
  });
}

/** Kayıt bittiğinde dönen geçici adresi kalıcı bir değere çevirir. */
export async function persistRecording(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return uri;

  const response = await fetch(uri);
  if (!response.ok) throw new Error('Kayıt okunamadı.');
  return blobToDataUri(await response.blob());
}

/**
 * Kayıt dosyasını siler. Web'de data URI veritabanıyla birlikte gider;
 * blob URL de oturumla ölür, ayrıca temizlenecek dosya yoktur.
 */
export async function removeRecordingFile(path: string | null | undefined): Promise<void> {
  if (!path || isInlineAudio(path) || Platform.OS === 'web') return;

  try {
    // expo-file-system v58'de `deleteAsync` yalnızca legacy girişinden gelir.
    const { deleteAsync } = await import('expo-file-system/legacy');
    await deleteAsync(path, { idempotent: true });
  } catch {
    // Dosya zaten yoksa kaydı kaldırma işlemi engellenmez.
  }
}

/** 0:00 biçiminde süre; kayıt ve oynatma aynı dili kullanır. */
export function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
