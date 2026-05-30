// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Hex Grid Data Structure
// ═══════════════════════════════════════════════════════════════

import { GAME_CONFIG, type HexCoord, type TileData, type TileState } from '@/types/game';
import { hexKey, hexNeighbors, isInBounds } from '@/utils/hexMath';

// ── HexGrid ───────────────────────────────────────────────────

export class HexGrid {
  /** Map size (one side of the square grid). */
  readonly size: number;

  /** Fast tile lookup by "q,r" key. */
  private tiles: Map<string, TileData> = new Map();

  /** Dirty flag — set when any tile changes. Renderers read & clear. */
  private _dirty = true;

  /** Set of keys that changed since last clearDirtyTiles() call. */
  private dirtyKeys: Set<string> = new Set();

  constructor(size: number = GAME_CONFIG.MAP_SIZE) {
    this.size = size;
  }

  // ── Dirty Tracking ────────────────────────────────────────

  get dirty(): boolean {
    return this._dirty;
  }

  markClean(): void {
    this._dirty = false;
  }

  getDirtyKeys(): ReadonlySet<string> {
    return this.dirtyKeys;
  }

  clearDirtyTiles(): void {
    this.dirtyKeys.clear();
  }

  // ── CRUD ──────────────────────────────────────────────────

  /** Get tile data at (q, r). Returns null if not present. */
  getTile(q: number, r: number): TileData | null {
    return this.tiles.get(hexKey(q, r)) ?? null;
  }

  /** Set or replace tile data at (q, r). */
  setTile(tile: TileData): void {
    const key = hexKey(tile.q, tile.r);
    this.tiles.set(key, tile);
    this._dirty = true;
    this.dirtyKeys.add(key);
  }

  /** Bulk set tiles — more efficient than individual setTile calls. */
  setTiles(tiles: TileData[]): void {
    for (const tile of tiles) {
      const key = hexKey(tile.q, tile.r);
      this.tiles.set(key, tile);
      this.dirtyKeys.add(key);
    }
    if (tiles.length > 0) this._dirty = true;
  }

  /** Remove tile data at (q, r). */
  removeTile(q: number, r: number): boolean {
    const key = hexKey(q, r);
    const existed = this.tiles.delete(key);
    if (existed) {
      this._dirty = true;
      this.dirtyKeys.add(key);
    }
    return existed;
  }

  /** Check if a tile exists at (q, r). */
  hasTile(q: number, r: number): boolean {
    return this.tiles.has(hexKey(q, r));
  }

  /** Total number of stored tiles. */
  get tileCount(): number {
    return this.tiles.size;
  }

  // ── Iteration ─────────────────────────────────────────────

  /** Iterate over all tiles. */
  forEach(callback: (tile: TileData, key: string) => void): void {
    this.tiles.forEach(callback);
  }

  /** Get all tiles as an array. */
  allTiles(): TileData[] {
    return Array.from(this.tiles.values());
  }

  /** Get the internal map (read-only access for performance-critical loops). */
  getRawMap(): ReadonlyMap<string, TileData> {
    return this.tiles;
  }

  // ── Neighbors ─────────────────────────────────────────────

  /** Get tile data for all existing neighbors of (q, r). */
  getNeighborTiles(q: number, r: number): TileData[] {
    const neighbors: TileData[] = [];
    for (const coord of hexNeighbors(q, r)) {
      const tile = this.tiles.get(hexKey(coord.q, coord.r));
      if (tile) neighbors.push(tile);
    }
    return neighbors;
  }

  /** Get neighbor coordinates that are within bounds. */
  getNeighborCoords(q: number, r: number): HexCoord[] {
    return hexNeighbors(q, r).filter((c) => isInBounds(c.q, c.r, this.size));
  }

  /**
   * Count how many neighbors of (q, r) are owned by the given player.
   * Useful for influence/attack calculations.
   */
  countPlayerNeighbors(q: number, r: number, playerId: string): number {
    let count = 0;
    for (const coord of hexNeighbors(q, r)) {
      const tile = this.tiles.get(hexKey(coord.q, coord.r));
      if (tile?.ownerId === playerId) count++;
    }
    return count;
  }

  // ── Queries ───────────────────────────────────────────────

  /** Get all tiles owned by a specific player. */
  getPlayerTiles(playerId: string): TileData[] {
    const results: TileData[] = [];
    this.tiles.forEach((tile) => {
      if (tile.ownerId === playerId) results.push(tile);
    });
    return results;
  }

  /** Count tiles by state. */
  countByState(state: TileState): number {
    let count = 0;
    this.tiles.forEach((tile) => {
      if (tile.state === state) count++;
    });
    return count;
  }

  /** Get tiles within a rectangular q,r range (for viewport culling). */
  getTilesInRange(
    minQ: number,
    maxQ: number,
    minR: number,
    maxR: number,
  ): TileData[] {
    const results: TileData[] = [];
    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        const tile = this.tiles.get(hexKey(q, r));
        if (tile) results.push(tile);
      }
    }
    return results;
  }

  /**
   * Check whether a tile is on the border of a player's territory
   * (i.e., has at least one neighbor that is not owned by the same player).
   */
  isTerritoryEdge(q: number, r: number): boolean {
    const tile = this.getTile(q, r);
    if (!tile || !tile.ownerId) return false;

    for (const coord of hexNeighbors(q, r)) {
      if (!isInBounds(coord.q, coord.r, this.size)) return true; // map edge
      const neighbor = this.tiles.get(hexKey(coord.q, coord.r));
      if (!neighbor || neighbor.ownerId !== tile.ownerId) return true;
    }
    return false;
  }

  // ── Bulk Operations ───────────────────────────────────────

  /** Clear all tiles. */
  clear(): void {
    this.tiles.clear();
    this._dirty = true;
    this.dirtyKeys.clear();
  }

  /**
   * Create a default neutral tile at (q, r).
   * Used for lazy initialization of the grid.
   */
  static createNeutralTile(q: number, r: number): TileData {
    return {
      q,
      r,
      ownerId: null,
      ownerColor: null,
      influenceStrength: 0,
      state: 'neutral',
      lastUpdated: Date.now(),
    };
  }
}
