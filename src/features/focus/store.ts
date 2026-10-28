/**
 * Focus (Odak) Zustand store.
 * Spec: docs/superpowers/specs/2026-10-28-focus-ring-design.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSetting, setSetting } from '@/features/settings/preferences';
import {
  FocusState,
  FocusMode,
  FocusSettings,
  FOCUS_DEFAULTS,
  FOCUS_SETTINGS_KEYS,
} from './types';

// SQLite-based storage adapter for Zustand persist (uses settings table)
const sqliteStorage = {
  getItem: (name: string) => {
    const value = getSetting(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    setSetting(name, value);
  },
  removeItem: (name: string) => {
    setSetting(name, ''); // Empty string effectively removes
  },
};

const initialState: FocusState = {
  mode: 'work',
  duration: FOCUS_DEFAULTS.duration * 60,
  timeLeft: FOCUS_DEFAULTS.duration * 60,
  totalSessions: FOCUS_DEFAULTS.totalSessions,
  completedWorkSessions: 0, // Will be hydrated from persist
  currentSessionProgress: 0,
  isRunning: false,
  innerColor: FOCUS_DEFAULTS.innerColor,
  outerColor: FOCUS_DEFAULTS.outerColor,
  breakInnerColor: FOCUS_DEFAULTS.breakInnerColor,
  breakOuterColor: FOCUS_DEFAULTS.breakOuterColor,
  timerId: null,
};

type FocusActions = {
  // Timer actions
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  
  // Mode actions
  setMode: (mode: FocusMode) => void;
  completeWorkSession: () => void;
  completeBreakSession: () => void;
  
  // Settings actions
  setDuration: (minutes: number) => void;
  setTotalSessions: (count: number) => void;
  setInnerColor: (color: string) => void;
  setOuterColor: (color: string) => void;
  
  // Internal
  _setCompletedWorkSessions: (count: number) => void;
  _setTimerId: (id: ReturnType<typeof setInterval> | null) => void;
  _hydrateCompletedSessions: () => void;
};

export const useFocusStore = create<FocusState & FocusActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Timer actions
      startTimer: () => {
        const { isRunning, timeLeft, duration, timerId } = get();
        if (isRunning) return;
        if (timeLeft <= 0) {
          set({ timeLeft: duration, currentSessionProgress: 0 });
        }
        
        const id = setInterval(() => get().tick(), 1000);
        set({ isRunning: true, timerId: id });
      },

      pauseTimer: () => {
        const { timerId } = get();
        if (timerId) {
          clearInterval(timerId);
          set({ isRunning: false, timerId: null });
        }
      },

      resetTimer: () => {
        const { duration } = get();
        get().pauseTimer();
        set({ 
          timeLeft: duration, 
          currentSessionProgress: 0,
        });
      },

      tick: () => {
        const { timeLeft, duration, mode, totalSessions, completedWorkSessions, isRunning } = get();
        if (!isRunning || timeLeft <= 0) return;

        const newTimeLeft = timeLeft - 1;
        const newProgress = 1 - (newTimeLeft / duration);

        set({ 
          timeLeft: newTimeLeft, 
          currentSessionProgress: newProgress 
        });

        if (newTimeLeft <= 0) {
          get().pauseTimer();
          
          if (mode === 'work') {
            get().completeWorkSession();
          } else {
            get().completeBreakSession();
          }
        }
      },

      // Mode actions
      setMode: (mode: FocusMode) => {
        const { duration } = get();
        
        get().pauseTimer();
        
        if (mode === 'work') {
          // Mola → Çalışma: completedWorkSessions KORUNUR
          set({ 
            mode: 'work',
            timeLeft: duration,
            currentSessionProgress: 0,
          });
        } else {
          // Çalışma → Mola: progress sıfırla
          set({ 
            mode: 'break',
            currentSessionProgress: 0,
          });
        }
      },

      completeWorkSession: () => {
        const { completedWorkSessions, totalSessions, duration } = get();
        const newCompleted = completedWorkSessions + 1;
        
        if (newCompleted >= totalSessions) {
          // Tüm çalışmalar bitti → Uzun mola (15 dk)
          set({ 
            mode: 'break',
            duration: 15 * 60,
            timeLeft: 15 * 60,
            completedWorkSessions: newCompleted,
            currentSessionProgress: 0,
          });
        } else {
          // Kısa mola (5 dk)
          set({ 
            mode: 'break',
            duration: 5 * 60,
            timeLeft: 5 * 60,
            completedWorkSessions: newCompleted,
            currentSessionProgress: 0,
          });
        }
      },

      completeBreakSession: () => {
        const { completedWorkSessions } = get();
        // Mola bitti → Çalışma'ya dön
        // Kullanıcının ayarladığı süreye geri dön
        const storedDuration = getSetting(FOCUS_SETTINGS_KEYS.duration);
        const durationMinutes = storedDuration ? parseInt(storedDuration, 10) : FOCUS_DEFAULTS.duration;
        
        set({ 
          mode: 'work',
          duration: durationMinutes * 60,
          timeLeft: durationMinutes * 60,
          completedWorkSessions: completedWorkSessions, // KORUNUR
          currentSessionProgress: 0,
        });
      },

      // Settings actions
      setDuration: (minutes: number) => {
        const { isRunning, mode } = get();
        const clamped = Math.max(1, Math.min(120, minutes));
        const seconds = clamped * 60;
        
        setSetting(FOCUS_SETTINGS_KEYS.duration, String(clamped));
        
        if (!isRunning && mode === 'work') {
          set({ duration: seconds, timeLeft: seconds });
        }
      },

      setTotalSessions: (count: number) => {
        const { isRunning } = get();
        if (isRunning) return;
        
        const validCounts = [2, 3, 4, 5, 6, 8];
        const clamped = validCounts.includes(count) ? count : 4;
        
        setSetting(FOCUS_SETTINGS_KEYS.totalSessions, String(clamped));
        set({ totalSessions: clamped, completedWorkSessions: 0 });
      },

      setInnerColor: (color: string) => {
        const { mode } = get();
        if (mode !== 'work') return;
        
        setSetting(FOCUS_SETTINGS_KEYS.innerColor, color);
        set({ innerColor: color });
      },

      setOuterColor: (color: string) => {
        const { mode } = get();
        if (mode !== 'work') return;
        
        setSetting(FOCUS_SETTINGS_KEYS.outerColor, color);
        set({ outerColor: color });
      },

      // Internal
      _setCompletedWorkSessions: (count: number) => {
        setSetting(FOCUS_SETTINGS_KEYS.completedWorkSessions, String(count));
        set({ completedWorkSessions: count });
      },

      _setTimerId: (id: ReturnType<typeof setInterval> | null) => {
        set({ timerId: id });
      },

      _hydrateCompletedSessions: () => {
        const stored = getSetting(FOCUS_SETTINGS_KEYS.completedWorkSessions);
        if (stored) {
          const count = parseInt(stored, 10);
          if (!isNaN(count) && count > 0) {
            set({ completedWorkSessions: count });
          }
        }
      },
    }),
    {
      name: 'focus-store',
      storage: createJSONStorage(() => sqliteStorage),
      partialize: (state) => ({
        // Persist edilen alanlar
        mode: state.mode,
        duration: state.duration,
        totalSessions: state.totalSessions,
        completedWorkSessions: state.completedWorkSessions,
        innerColor: state.innerColor,
        outerColor: state.outerColor,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hydrateCompletedSessions();
        }
      },
    }
  )
);

// Selector hooks for performance
export const useFocusMode = () => useFocusStore((s) => s.mode);
export const useFocusDuration = () => useFocusStore((s) => s.duration);
export const useFocusTimeLeft = () => useFocusStore((s) => s.timeLeft);
export const useFocusTotalSessions = () => useFocusStore((s) => s.totalSessions);
export const useFocusCompletedWorkSessions = () => useFocusStore((s) => s.completedWorkSessions);
export const useFocusCurrentProgress = () => useFocusStore((s) => s.currentSessionProgress);
export const useFocusIsRunning = () => useFocusStore((s) => s.isRunning);
export const useFocusInnerColor = () => useFocusStore((s) => s.innerColor);
export const useFocusOuterColor = () => useFocusStore((s) => s.outerColor);
export const useFocusBreakInnerColor = () => useFocusStore((s) => s.breakInnerColor);
export const useFocusBreakOuterColor = () => useFocusStore((s) => s.breakOuterColor);
export const useFocusActions = () => useFocusStore((s) => ({
  startTimer: s.startTimer,
  pauseTimer: s.pauseTimer,
  resetTimer: s.resetTimer,
  setMode: s.setMode,
  setDuration: s.setDuration,
  setTotalSessions: s.setTotalSessions,
  setInnerColor: s.setInnerColor,
  setOuterColor: s.setOuterColor,
}));