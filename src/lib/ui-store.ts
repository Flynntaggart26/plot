import { create } from 'zustand';

/**
 * UI-seviye geçici durum (veri katmanı değil):
 * yakalama sheet'i gibi kısa ömürlü açılışlar.
 */
type UIState = {
  captureOpen: boolean;
  setCaptureOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  captureOpen: false,
  setCaptureOpen: (open) => set({ captureOpen: open }),
}));
