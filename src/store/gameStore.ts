// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Game State Store
// Central command state management
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { TileData, PlayerScore, FeedMessage, HexCoord, SeasonInfo } from '@/types/game';
import { GAME_CONFIG } from '@/types/game';

interface GameState {
  // ── Player Identity ──────────────────────────────────────────
  playerId: string | null;
  username: string;
  color: string;

  // ── Energy System ────────────────────────────────────────────
  energy: number;
  maxEnergy: number;
  energyRegenRate: number;

  // ── Map State ────────────────────────────────────────────────
  tiles: Map<string, TileData>;

  // ── Leaderboard ──────────────────────────────────────────────
  leaderboard: PlayerScore[];

  // ── Activity Feed ────────────────────────────────────────────
  activityFeed: FeedMessage[];

  // ── Season ───────────────────────────────────────────────────
  seasonInfo: SeasonInfo | null;

  // ── Hex Interaction ──────────────────────────────────────────
  hoveredHex: HexCoord | null;
  selectedHex: HexCoord | null;

  // ── Connection State ─────────────────────────────────────────
  isJoined: boolean;

  // ── Actions ──────────────────────────────────────────────────
  setPlayer: (id: string, username: string, color: string) => void;
  updateTile: (tile: TileData) => void;
  batchUpdateTiles: (tiles: TileData[]) => void;
  addFeedMessage: (message: FeedMessage) => void;
  updateLeaderboard: (scores: PlayerScore[]) => void;
  setHoveredHex: (hex: HexCoord | null) => void;
  setSelectedHex: (hex: HexCoord | null) => void;
  regenerateEnergy: (deltaSeconds: number) => void;
  deductEnergy: (amount: number) => boolean;
  setJoined: (joined: boolean) => void;
  setSeasonInfo: (info: SeasonInfo) => void;
  getPlayerTerritory: () => number;
  getPlayerDomination: () => number;
}

export const useGameStore = create<GameState>((set, get) => ({
  // ── Initial State ──────────────────────────────────────────────
  playerId: null,
  username: '',
  color: '#00ffcc',

  energy: GAME_CONFIG.MAX_ENERGY,
  maxEnergy: GAME_CONFIG.MAX_ENERGY,
  energyRegenRate: GAME_CONFIG.ENERGY_REGEN_RATE,

  tiles: new Map<string, TileData>(),

  leaderboard: [],

  activityFeed: [],

  seasonInfo: null,

  hoveredHex: null,
  selectedHex: null,

  isJoined: false,

  // ── Actions ────────────────────────────────────────────────────

  setPlayer: (id, username, color) =>
    set({ playerId: id, username, color }),

  updateTile: (tile) =>
    set((state) => {
      const key = `${tile.q},${tile.r}`;
      const newTiles = new Map(state.tiles);
      newTiles.set(key, tile);
      return { tiles: newTiles };
    }),

  batchUpdateTiles: (tiles) =>
    set((state) => {
      const newTiles = new Map(state.tiles);
      for (const tile of tiles) {
        const key = `${tile.q},${tile.r}`;
        newTiles.set(key, tile);
      }
      return { tiles: newTiles };
    }),

  addFeedMessage: (message) =>
    set((state) => {
      const feed = [message, ...state.activityFeed];
      // Enforce max feed size
      if (feed.length > GAME_CONFIG.MAX_FEED_MESSAGES) {
        feed.length = GAME_CONFIG.MAX_FEED_MESSAGES;
      }
      return { activityFeed: feed };
    }),

  updateLeaderboard: (scores) =>
    set({ leaderboard: scores }),

  setHoveredHex: (hex) =>
    set({ hoveredHex: hex }),

  setSelectedHex: (hex) =>
    set({ selectedHex: hex }),

  regenerateEnergy: (deltaSeconds) =>
    set((state) => {
      const newEnergy = Math.min(
        state.maxEnergy,
        state.energy + state.energyRegenRate * deltaSeconds
      );
      return { energy: newEnergy };
    }),

  deductEnergy: (amount) => {
    const state = get();
    if (state.energy < amount) return false;
    set({ energy: state.energy - amount });
    return true;
  },

  setJoined: (joined) =>
    set({ isJoined: joined }),

  setSeasonInfo: (info) =>
    set({ seasonInfo: info }),

  getPlayerTerritory: () => {
    const state = get();
    if (!state.playerId) return 0;
    let count = 0;
    state.tiles.forEach((tile) => {
      if (tile.ownerId === state.playerId) count++;
    });
    return count;
  },

  getPlayerDomination: () => {
    const state = get();
    if (!state.playerId) return 0;
    let owned = 0;
    let totalOwned = 0;
    state.tiles.forEach((tile) => {
      if (tile.ownerId) {
        totalOwned++;
        if (tile.ownerId === state.playerId) owned++;
      }
    });
    return totalOwned > 0 ? (owned / totalOwned) * 100 : 0;
  },
}));
