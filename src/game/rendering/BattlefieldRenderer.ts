// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Battlefield Renderer (Main Orchestrator)
// ═══════════════════════════════════════════════════════════════
// Coordinates the rendering pipeline: clear → transform → grid →
// tiles (batched) → borders → effects → hover → selection.

import { GAME_CONFIG, type TileData, type HexCoord } from '@/types/game';
import { hexKey, isInBounds } from '@/utils/hexMath';
import { THEME } from '@/utils/colors';
import { ViewportManager } from './ViewportManager';
import { GridRenderer } from './GridRenderer';
import { HexRenderer } from './HexRenderer';
import { EffectsRenderer } from './EffectsRenderer';
import { HexGrid } from '../engine/HexGrid';

// ── Types ─────────────────────────────────────────────────────

/** External function that provides tile data for a coordinate. */
export type TileDataSource = (q: number, r: number) => TileData | null;

export interface BattlefieldRendererOptions {
  /** Canvas to render on. */
  canvas: HTMLCanvasElement;

  /** Data source for tiles — the grid or a server-sync function. */
  tileSource?: TileDataSource;

  /** The HexGrid instance for direct data access. */
  grid?: HexGrid;
}

// ── BattlefieldRenderer ───────────────────────────────────────

export class BattlefieldRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  /** Sub-renderers. */
  readonly viewport: ViewportManager;
  readonly gridRenderer: GridRenderer;
  readonly hexRenderer: HexRenderer;
  readonly effects: EffectsRenderer;

  /** Data source. */
  private tileSource: TileDataSource | null = null;
  private grid: HexGrid | null = null;

  /** Interaction state. */
  private _hoveredHex: HexCoord | null = null;
  private _selectedHex: HexCoord | null = null;

  /** Performance tracking. */
  private _lastRenderTime = 0;
  private _visibleTileCount = 0;
  private _drawCalls = 0;

  /** Force full redraw flag. */
  private _forceRedraw = true;

  constructor(options: BattlefieldRendererOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get 2D canvas context');
    this.ctx = ctx;

    this.viewport = new ViewportManager();
    this.gridRenderer = new GridRenderer();
    this.hexRenderer = new HexRenderer();
    this.effects = new EffectsRenderer();

    if (options.tileSource) this.tileSource = options.tileSource;
    if (options.grid) this.grid = options.grid;

    // Initial sizing
    this.handleResize();
  }

  // ── Configuration ─────────────────────────────────────────

  /** Set the tile data source (function-based). */
  setTileSource(source: TileDataSource): void {
    this.tileSource = source;
  }

  /** Set the grid data source (direct HexGrid). */
  setGrid(grid: HexGrid): void {
    this.grid = grid;
  }

  // ── Interaction State ─────────────────────────────────────

  get hoveredHex(): HexCoord | null {
    return this._hoveredHex;
  }

  set hoveredHex(hex: HexCoord | null) {
    this._hoveredHex = hex;
  }

  get selectedHex(): HexCoord | null {
    return this._selectedHex;
  }

  set selectedHex(hex: HexCoord | null) {
    this._selectedHex = hex;
  }

  // ── Resize ────────────────────────────────────────────────

  handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    // Set canvas buffer size to match CSS size * DPR
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.viewport.setCanvasSize(rect.width, rect.height, dpr);
    this._forceRedraw = true;
  }

  forceRedraw(): void {
    this._forceRedraw = true;
  }

  // ── Main Render Pipeline ──────────────────────────────────

  /**
   * Main render method — called once per frame by the game loop.
   * @param deltaMs - Time since last frame
   * @param now - Current performance.now() timestamp
   */
  render(deltaMs: number, now: number): void {
    const renderStart = performance.now();

    // Update viewport inertia
    this.viewport.updateInertia(deltaMs);

    // Prune expired effects
    this.effects.update(now);

    // Decide if we need to render
    const needsRender =
      this._forceRedraw ||
      this.viewport.dirty ||
      this.effects.hasActiveEffects ||
      (this.grid?.dirty ?? false);

    if (!needsRender) {
      return; // Skip frame — nothing changed
    }

    const ctx = this.ctx;
    const vp = this.viewport;

    // 1. Clear the entire canvas (screen space)
    vp.resetTransform(ctx);
    ctx.fillStyle = THEME.BG_DARK;
    ctx.fillRect(0, 0, this.canvas.width / vp.dpr, this.canvas.height / vp.dpr);

    // 2. Apply viewport transform (world space)
    vp.applyTransform(ctx);

    // 3. Get visible hex range
    const range = vp.getVisibleRange();
    const mapSize = this.grid?.size ?? GAME_CONFIG.MAP_SIZE;

    // Clamp to map bounds
    const minQ = Math.max(0, range.minQ);
    const maxQ = Math.min(mapSize - 1, range.maxQ);
    const minR = Math.max(0, range.minR);
    const maxR = Math.min(mapSize - 1, range.maxR);

    // 4. Render background grid lines
    this.gridRenderer.render(ctx, vp, mapSize);

    // 5. Collect visible tiles
    const visibleTiles = this.collectVisibleTiles(minQ, maxQ, minR, maxR);
    this._visibleTileCount = visibleTiles.length;

    // 6. Render tiles with color batching
    if (visibleTiles.length > 0) {
      this.hexRenderer.renderTilesBatched(ctx, visibleTiles, now, vp);
    }

    // 7. Render territory edge glow
    const edgeTiles = this.collectEdgeTiles(visibleTiles);
    if (edgeTiles.length > 0) {
      this.hexRenderer.renderTerritoryEdges(ctx, edgeTiles, now, vp.zoom);
    }

    // 8. Render effects (ripples, pulses)
    this.effects.render(ctx, vp, now);

    // 9. Render hover highlight
    if (this._hoveredHex && isInBounds(this._hoveredHex.q, this._hoveredHex.r, mapSize)) {
      this.hexRenderer.renderHover(ctx, this._hoveredHex, vp.zoom);
    }

    // 10. Render selection indicator
    if (this._selectedHex && isInBounds(this._selectedHex.q, this._selectedHex.r, mapSize)) {
      this.hexRenderer.renderSelection(ctx, this._selectedHex, now, vp.zoom);
    }

    // Clean up dirty flags
    vp.markClean();
    this.grid?.markClean();
    this._forceRedraw = false;

    this._lastRenderTime = performance.now() - renderStart;
  }

  // ── Tile Collection ───────────────────────────────────────

  private collectVisibleTiles(
    minQ: number,
    maxQ: number,
    minR: number,
    maxR: number,
  ): TileData[] {
    // Prefer grid-based lookup (faster for sparse maps)
    if (this.grid) {
      return this.grid.getTilesInRange(minQ, maxQ, minR, maxR);
    }

    // Fallback to tile source function
    if (this.tileSource) {
      const tiles: TileData[] = [];
      for (let q = minQ; q <= maxQ; q++) {
        for (let r = minR; r <= maxR; r++) {
          const tile = this.tileSource(q, r);
          if (tile) tiles.push(tile);
        }
      }
      return tiles;
    }

    return [];
  }

  private collectEdgeTiles(tiles: TileData[]): TileData[] {
    if (!this.grid) return [];

    const edges: TileData[] = [];
    for (const tile of tiles) {
      if (tile.state === 'owned' && tile.ownerId && this.grid.isTerritoryEdge(tile.q, tile.r)) {
        edges.push(tile);
      }
    }
    return edges;
  }

  // ── Stats / Debug ─────────────────────────────────────────

  get lastRenderTime(): number {
    return this._lastRenderTime;
  }

  get visibleTileCount(): number {
    return this._visibleTileCount;
  }

  getStats(): {
    renderTimeMs: number;
    visibleTiles: number;
    zoom: number;
    activeRipples: number;
    activePulses: number;
  } {
    return {
      renderTimeMs: this._lastRenderTime,
      visibleTiles: this._visibleTileCount,
      zoom: this.viewport.zoom,
      activeRipples: this.effects.activeRippleCount,
      activePulses: this.effects.activePulseCount,
    };
  }

  // ── Cleanup ───────────────────────────────────────────────

  destroy(): void {
    this.effects.clearAll();
    this.hexRenderer.clearCache();
    this.tileSource = null;
    this.grid = null;
  }
}
