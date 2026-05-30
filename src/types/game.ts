// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Type Definitions
// ═══════════════════════════════════════════════════════════════

// ── Hex Grid ──────────────────────────────────────────────────

export interface HexCoord {
  q: number;
  r: number;
}

export type TileState = 'neutral' | 'owned' | 'contested' | 'influenced';

export interface TileData {
  q: number;
  r: number;
  ownerId: string | null;
  ownerColor: string | null;
  influenceStrength: number;
  state: TileState;
  lastUpdated: number;
}

// ── Player ────────────────────────────────────────────────────

export interface PlayerData {
  id: string;
  username: string;
  color: string;
  influenceScore: number;
  energy: number;
  maxEnergy: number;
  totalCaptures: number;
  attackWins: number;
  createdAt: number;
}

export interface PlayerScore {
  id: string;
  username: string;
  color: string;
  territory: number;
  captures: number;
  attackWins: number;
  influenceScore: number;
  dominationPct: number;
}

// ── Presence ──────────────────────────────────────────────────

export interface PresenceData {
  id: string;
  username: string;
  color: string;
  lastSeen: number;
  cursorHex?: HexCoord;
}

// ── Activity Feed ─────────────────────────────────────────────

export type FeedMessageType = 'capture' | 'attack' | 'system' | 'warning' | 'join' | 'leave';

export interface FeedMessage {
  id: string;
  text: string;
  icon: string;
  timestamp: number;
  type: FeedMessageType;
  playerColor?: string;
}

// ── Season ────────────────────────────────────────────────────

export interface SeasonInfo {
  id: string;
  startedAt: number;
  endsAt: number;
  timeRemaining: number;
}

export interface SeasonChampion {
  seasonId: string;
  playerId: string;
  username: string;
  color: string;
  score: number;
  endedAt: number;
}

// ── Game Engine ───────────────────────────────────────────────

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface RippleEffect {
  q: number;
  r: number;
  color: string;
  startTime: number;
  duration: number;
}

export interface PulseEffect {
  q: number;
  r: number;
  color: string;
  phase: number;
}

// ── Game Constants ────────────────────────────────────────────

export const GAME_CONFIG = {
  MAP_SIZE: 120,
  HEX_SIZE: 20,
  
  MAX_ENERGY: 100,
  ENERGY_REGEN_RATE: 2, // per second
  CAPTURE_COST: 10,
  ATTACK_COST: 25,
  
  CAPTURE_COOLDOWN: 500, // ms
  ATTACK_COOLDOWN: 2000, // ms
  
  MIN_ZOOM: 0.15,
  MAX_ZOOM: 4.0,
  
  SEASON_DURATION: 24 * 60 * 60 * 1000, // 24 hours in ms
  
  MAX_FEED_MESSAGES: 50,
  
  INFLUENCE_PER_NEIGHBOR: 0.1,
  MAX_INFLUENCE: 5.0,
  
  BASE_ATTACK_SUCCESS: 0.6,
  ATTACK_ADJACENCY_BONUS: 0.1,
  ATTACK_DEFENDER_PENALTY: 0.1,
  INFLUENCE_DEFENSE_BONUS: 0.05,
} as const;

// ── API Types ─────────────────────────────────────────────────

export interface CaptureRequest {
  playerId: string;
  q: number;
  r: number;
}

export interface CaptureResponse {
  success: boolean;
  tile?: TileData;
  energy?: number;
  error?: string;
}

export interface AttackRequest {
  playerId: string;
  q: number;
  r: number;
}

export interface AttackResponse {
  success: boolean;
  won?: boolean;
  tile?: TileData;
  energy?: number;
  error?: string;
}

export interface JoinRequest {
  username: string;
  color: string;
}

export interface JoinResponse {
  player: PlayerData;
}

// ── Database Row Types ────────────────────────────────────────

export interface DbPlayer {
  id: string;
  username: string;
  color: string;
  influence_score: number;
  energy: number;
  max_energy: number;
  last_energy_update: string;
  total_captures: number;
  attack_wins: number;
  created_at: string;
}

export interface DbTile {
  id: string;
  q: number;
  r: number;
  owner_id: string | null;
  influence_strength: number;
  updated_at: string;
}
