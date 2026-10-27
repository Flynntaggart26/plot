import { create } from 'zustand';

export type ToastTone = 'success' | 'info' | 'error';

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastState = {
  toast: Toast | null;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
};

/**
 * Tek seferde tek bildirim. Kuyruk yok: son mesaj öncekini ezer.
 * Kaydetme/silme gibi kısa geri bildirimler için; hata mesajları
 * hâlâ ekran içinde kalır çünkü kullanıcı orada eyleme geçebilir.
 */
export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, tone = 'success') => set({ toast: { id: Date.now(), message, tone } }),
  hide: () => set({ toast: null }),
}));

export function toast(message: string, tone: ToastTone = 'success') {
  useToastStore.getState().show(message, tone);
}
