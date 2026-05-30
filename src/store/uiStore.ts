// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — UI State Store
// Interface configuration & panel visibility
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

interface UIState {
  // ── Panel Visibility ─────────────────────────────────────────
  showLeaderboard: boolean;
  showActivityFeed: boolean;
  showMinimap: boolean;
  showOnlineUsers: boolean;

  // ── Theme ────────────────────────────────────────────────────
  theme: 'dark' | 'light';

  // ── Audio ────────────────────────────────────────────────────
  soundEnabled: boolean;
  soundVolume: number;

  // ── Toggle Actions ───────────────────────────────────────────
  toggleLeaderboard: () => void;
  toggleActivityFeed: () => void;
  toggleMinimap: () => void;
  toggleOnlineUsers: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  showLeaderboard: false,
  showActivityFeed: true,
  showMinimap: true,
  showOnlineUsers: true,

  theme: 'dark',

  soundEnabled: true,
  soundVolume: 0.3,

  toggleLeaderboard: () =>
    set((state) => ({ showLeaderboard: !state.showLeaderboard })),

  toggleActivityFeed: () =>
    set((state) => ({ showActivityFeed: !state.showActivityFeed })),

  toggleMinimap: () =>
    set((state) => ({ showMinimap: !state.showMinimap })),

  toggleOnlineUsers: () =>
    set((state) => ({ showOnlineUsers: !state.showOnlineUsers })),

  setTheme: (theme) => set({ theme }),

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    })),

  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  setSoundVolume: (volume) =>
    set({ soundVolume: Math.max(0, Math.min(1, volume)) }),
}));
