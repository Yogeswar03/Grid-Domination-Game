// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Game Engine (Main Orchestrator)
// ═══════════════════════════════════════════════════════════════
// Ties together the grid data, rendering pipeline, game loop,
// and input handling into a single cohesive API.

import {
  GAME_CONFIG,
  type HexCoord,
  type TileData,
  type RippleEffect,
  type Viewport,
} from '@/types/game';
import { hexToPixel, isInBounds } from '@/utils/hexMath';

import { HexGrid } from './HexGrid';
import { GameLoop } from './GameLoop';
import { BattlefieldRenderer, type TileDataSource } from '../rendering/BattlefieldRenderer';
import { ViewportManager } from '../rendering/ViewportManager';
import { InputHandler, type InputCallbacks } from '../input/InputHandler';

// ── Types ─────────────────────────────────────────────────────

export interface GameEngineOptions {
  /** The canvas element to render on. */
  canvas: HTMLCanvasElement;

  /** Grid size (default: GAME_CONFIG.MAP_SIZE). */
  mapSize?: number;

  /** Optional external tile data source. */
  tileSource?: TileDataSource;

  /** Input callbacks. */
  onHexClick?: (hex: HexCoord) => void;
  onHexHover?: (hex: HexCoord | null) => void;
  onHexRightClick?: (hex: HexCoord) => void;
  onZoomChange?: (zoom: number) => void;
}

export interface EngineStats {
  fps: number;
  frameTimeMs: number;
  renderTimeMs: number;
  visibleTiles: number;
  totalTiles: number;
  zoom: number;
  activeRipples: number;
  activePulses: number;
}

// ── GameEngine ────────────────────────────────────────────────

export class GameEngine {
  /** The hex grid data structure. */
  readonly grid: HexGrid;

  /** The rendering pipeline. */
  readonly renderer: BattlefieldRenderer;

  /** The game loop. */
  readonly loop: GameLoop;

  /** The input handler. */
  readonly input: InputHandler;

  /** Canvas element reference. */
  private canvas: HTMLCanvasElement;

  /** Whether the engine is initialized and running. */
  private _initialized = false;

  /** Resize observer for auto-resizing. */
  private resizeObserver: ResizeObserver | null = null;

  /** Bound resize handler. */
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: GameEngineOptions) {
    const {
      canvas,
      mapSize = GAME_CONFIG.MAP_SIZE,
      tileSource,
      onHexClick,
      onHexHover,
      onHexRightClick,
      onZoomChange,
    } = options;

    this.canvas = canvas;

    // Create grid
    this.grid = new HexGrid(mapSize);

    // Create renderer
    this.renderer = new BattlefieldRenderer({
      canvas,
      grid: this.grid,
      tileSource,
    });

    // Create game loop
    this.loop = new GameLoop();

    // Create input handler
    this.input = new InputHandler(canvas, this.renderer.viewport, {
      onHexClick: (hex, event) => {
        this.renderer.selectedHex = hex;
        onHexClick?.(hex);
      },
      onHexHover: (hex) => {
        this.renderer.hoveredHex = hex;
        onHexHover?.(hex);
      },
      onHexRightClick: (hex, event) => {
        onHexRightClick?.(hex);
      },
      onZoomChange: (zoom) => {
        onZoomChange?.(zoom);
      },
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────

  /**
   * Initialize the engine — sets up the render loop, resize observer,
   * and starts rendering.
   */
  init(): void {
    if (this._initialized) return;

    // Register the render callback in the game loop
    this.loop.addCallback('render', (deltaMs, totalMs) => {
      this.renderer.render(deltaMs, totalMs);
    });

    // Set up resize observer
    this.resizeObserver = new ResizeObserver(() => {
      // Debounce resize to avoid excessive recalculation
      if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.renderer.handleResize();
      }, 50);
    });
    this.resizeObserver.observe(this.canvas);

    // Start the loop
    this.loop.start();
    this._initialized = true;
  }

  /**
   * Destroy the engine — stops the loop, removes listeners,
   * cleans up resources.
   */
  destroy(): void {
    this.loop.stop();
    this.input.destroy();
    this.renderer.destroy();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }

    this._initialized = false;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  // ── Tile Operations ───────────────────────────────────────

  /**
   * Capture a tile — updates grid data and triggers a ripple effect.
   * Call this when a player captures a hex.
   */
  captureTile(
    q: number,
    r: number,
    playerId: string,
    playerColor: string,
  ): void {
    const tile: TileData = {
      q,
      r,
      ownerId: playerId,
      ownerColor: playerColor,
      influenceStrength: 1,
      state: 'owned',
      lastUpdated: Date.now(),
    };

    this.grid.setTile(tile);

    // Trigger capture ripple
    this.renderer.effects.addRipple(q, r, playerColor);
  }

  /**
   * Bulk update tiles — used when syncing from server.
   * Does NOT trigger effects for each tile.
   */
  updateTiles(tiles: TileData[]): void {
    this.grid.setTiles(tiles);
  }

  /**
   * Update a single tile without effects.
   */
  updateTile(tile: TileData): void {
    this.grid.setTile(tile);
  }

  /**
   * Set a tile as contested (being fought over).
   */
  contestTile(q: number, r: number, attackerColor: string): void {
    const existing = this.grid.getTile(q, r);
    if (existing) {
      this.grid.setTile({
        ...existing,
        state: 'contested',
        lastUpdated: Date.now(),
      });
      this.renderer.effects.addPulse(q, r, attackerColor);
    }
  }

  /**
   * Clear contested state on a tile.
   */
  resolveContest(q: number, r: number): void {
    const existing = this.grid.getTile(q, r);
    if (existing && existing.state === 'contested') {
      this.grid.setTile({
        ...existing,
        state: existing.ownerId ? 'owned' : 'neutral',
        lastUpdated: Date.now(),
      });
      this.renderer.effects.removePulse(q, r);
    }
  }

  // ── Camera ────────────────────────────────────────────────

  /** Center the camera on a hex coordinate. */
  centerOn(q: number, r: number): void {
    this.renderer.viewport.centerOn(q, r);
  }

  /** Center on a specific pixel position. */
  centerOnPixel(x: number, y: number): void {
    const vp = this.renderer.viewport;
    // Calculate q,r from pixel then center
    // Actually directly set viewport position
    const width = vp.width;
    const height = vp.height;
    const zoom = vp.zoom;

    // We want (x, y) at center of screen
    this.renderer.viewport.centerOn(0, 0); // reset
    // Use the existing centerOn method which does the right thing
    // We need to find hex at pixel position... simpler to just calculate
    const targetX = x - width / (2 * zoom);
    const targetY = y - height / (2 * zoom);
    // Actually, let's use the viewport methods properly
    this.renderer.viewport.centerOn(
      Math.round(x / 30), // approximate q from x
      Math.round(y / 34.64), // approximate r from y
    );
  }

  /** Center the camera on the map center. */
  centerOnMap(): void {
    const halfSize = Math.floor(this.grid.size / 2);
    this.centerOn(halfSize, halfSize);
  }

  /** Set zoom level. */
  setZoom(zoom: number): void {
    this.renderer.viewport.setZoom(zoom);
  }

  /** Get current zoom. */
  getZoom(): number {
    return this.renderer.viewport.zoom;
  }

  /** Get the current viewport state. */
  getViewport(): Viewport {
    return this.renderer.viewport.getViewport();
  }

  // ── Queries ───────────────────────────────────────────────

  /** Get the hex currently under the mouse cursor. */
  getHoveredHex(): HexCoord | null {
    return this.input.hoveredHex;
  }

  /** Get the currently selected hex. */
  getSelectedHex(): HexCoord | null {
    return this.renderer.selectedHex;
  }

  /** Set the selected hex programmatically. */
  setSelectedHex(hex: HexCoord | null): void {
    this.renderer.selectedHex = hex;
  }

  /** Get tile data at a coordinate. */
  getTile(q: number, r: number): TileData | null {
    return this.grid.getTile(q, r);
  }

  /** Check if a coordinate is within map bounds. */
  isInBounds(q: number, r: number): boolean {
    return isInBounds(q, r, this.grid.size);
  }

  // ── Effects ───────────────────────────────────────────────

  /** Manually trigger a ripple effect. */
  addRipple(q: number, r: number, color: string, duration?: number): void {
    this.renderer.effects.addRipple(q, r, color, duration);
  }

  /** Manually trigger a pulse effect. */
  addPulse(q: number, r: number, color: string): void {
    this.renderer.effects.addPulse(q, r, color);
  }

  /** Remove a pulse effect. */
  removePulse(q: number, r: number): void {
    this.renderer.effects.removePulse(q, r);
  }

  /** Clear all visual effects. */
  clearEffects(): void {
    this.renderer.effects.clearAll();
  }

  // ── Stats ─────────────────────────────────────────────────

  getStats(): EngineStats {
    const renderStats = this.renderer.getStats();
    return {
      fps: this.loop.currentFps,
      frameTimeMs: this.loop.lastFrameTime,
      renderTimeMs: renderStats.renderTimeMs,
      visibleTiles: renderStats.visibleTiles,
      totalTiles: this.grid.tileCount,
      zoom: renderStats.zoom,
      activeRipples: renderStats.activeRipples,
      activePulses: renderStats.activePulses,
    };
  }

  // ── Force Redraw ──────────────────────────────────────────

  /** Force a full redraw next frame. */
  forceRedraw(): void {
    this.renderer.forceRedraw();
  }
}
