// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Presence State Store
// Real-time player tracking & presence management
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

export interface OnlinePlayer {
  id: string;
  username: string;
  color: string;
  lastSeen: number;
}

interface PresenceState {
  // ── Online Players ───────────────────────────────────────────
  onlinePlayers: OnlinePlayer[];

  // ── Actions ──────────────────────────────────────────────────
  setOnlinePlayers: (players: OnlinePlayer[]) => void;
  addPlayer: (player: OnlinePlayer) => void;
  removePlayer: (playerId: string) => void;
  updatePlayerSeen: (playerId: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlinePlayers: [],

  setOnlinePlayers: (players) =>
    set({ onlinePlayers: players }),

  addPlayer: (player) =>
    set((state) => {
      // Avoid duplicates
      const exists = state.onlinePlayers.some((p) => p.id === player.id);
      if (exists) {
        return {
          onlinePlayers: state.onlinePlayers.map((p) =>
            p.id === player.id ? { ...p, lastSeen: Date.now() } : p
          ),
        };
      }
      return {
        onlinePlayers: [...state.onlinePlayers, { ...player, lastSeen: Date.now() }],
      };
    }),

  removePlayer: (playerId) =>
    set((state) => ({
      onlinePlayers: state.onlinePlayers.filter((p) => p.id !== playerId),
    })),

  updatePlayerSeen: (playerId) =>
    set((state) => ({
      onlinePlayers: state.onlinePlayers.map((p) =>
        p.id === playerId ? { ...p, lastSeen: Date.now() } : p
      ),
    })),
}));
