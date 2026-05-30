// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Viewport Manager
// ═══════════════════════════════════════════════════════════════
// Handles camera position, zoom level, DPI scaling, coordinate
// transforms, and viewport culling.

import { GAME_CONFIG, type Viewport, type HexCoord } from '@/types/game';
import {
  hexToPixel,
  pixelToHexRounded,
  getVisibleHexRange,
  type VisibleRange,
} from '@/utils/hexMath';

// ── Constants ─────────────────────────────────────────────────

const MIN_ZOOM = GAME_CONFIG.MIN_ZOOM;
const MAX_ZOOM = GAME_CONFIG.MAX_ZOOM;
const ZOOM_SPEED = 0.001;
const PAN_INERTIA_DECAY = 0.92;
const PAN_INERTIA_MIN = 0.5;

// ── ViewportManager ───────────────────────────────────────────

export class ViewportManager {
  /** Camera position in world space (top-left corner of view). */
  private _x = 0;
  private _y = 0;

  /** Current zoom level. */
  private _zoom = 1;

  /** Canvas CSS dimensions. */
  private _width = 0;
  private _height = 0;

  /** Device pixel ratio for Retina support. */
  private _dpr = 1;

  /** Cached visible hex range (recalculated on movement). */
  private _visibleRange: VisibleRange = { minQ: 0, maxQ: 0, minR: 0, maxR: 0 };
  private _visibleRangeDirty = true;

  /** Pan inertia velocity. */
  private velocityX = 0;
  private velocityY = 0;

  /** Whether the viewport has changed since last render. */
  private _dirty = true;

  // ── Initialization ────────────────────────────────────────

  /**
   * Initialize viewport dimensions from the canvas element.
   * Must be called after canvas is mounted and on resize.
   */
  setCanvasSize(width: number, height: number, dpr: number = window.devicePixelRatio || 1): void {
    this._width = width;
    this._height = height;
    this._dpr = dpr;
    this._dirty = true;
    this._visibleRangeDirty = true;
  }

  // ── Getters ───────────────────────────────────────────────

  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get zoom(): number { return this._zoom; }
  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get dpr(): number { return this._dpr; }
  get dirty(): boolean { return this._dirty; }

  /** The full viewport state. */
  getViewport(): Viewport {
    return {
      x: this._x,
      y: this._y,
      zoom: this._zoom,
      width: this._width,
      height: this._height,
    };
  }

  markClean(): void {
    this._dirty = false;
  }

  // ── Camera Movement ───────────────────────────────────────

  /** Pan the camera by a pixel delta (in screen space). */
  pan(screenDx: number, screenDy: number): void {
    this._x -= screenDx / this._zoom;
    this._y -= screenDy / this._zoom;
    this._dirty = true;
    this._visibleRangeDirty = true;
  }

  /** Set pan velocity for inertia (from mouse release). */
  setPanVelocity(vx: number, vy: number): void {
    this.velocityX = vx;
    this.velocityY = vy;
  }

  /** Update inertia — call each frame. Returns true if still moving. */
  updateInertia(deltaMs: number): boolean {
    if (Math.abs(this.velocityX) < PAN_INERTIA_MIN && Math.abs(this.velocityY) < PAN_INERTIA_MIN) {
      this.velocityX = 0;
      this.velocityY = 0;
      return false;
    }

    const factor = deltaMs / 16.67; // normalize to 60fps
    this._x -= (this.velocityX * factor) / this._zoom;
    this._y -= (this.velocityY * factor) / this._zoom;

    this.velocityX *= PAN_INERTIA_DECAY;
    this.velocityY *= PAN_INERTIA_DECAY;

    this._dirty = true;
    this._visibleRangeDirty = true;
    return true;
  }

  /**
   * Zoom toward/away from a screen-space point.
   * The point stays fixed on-screen (zoom-to-cursor behavior).
   */
  zoomAt(screenX: number, screenY: number, wheelDelta: number): void {
    const oldZoom = this._zoom;
    const zoomFactor = 1 - wheelDelta * ZOOM_SPEED;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this._zoom * zoomFactor));

    if (newZoom === oldZoom) return;

    // World position under the cursor before zoom
    const worldX = this._x + screenX / oldZoom;
    const worldY = this._y + screenY / oldZoom;

    this._zoom = newZoom;

    // Adjust camera so the world point stays under the cursor
    this._x = worldX - screenX / newZoom;
    this._y = worldY - screenY / newZoom;

    this._dirty = true;
    this._visibleRangeDirty = true;
  }

  /** Jump camera to center on a hex coordinate. */
  centerOn(q: number, r: number): void {
    const { x, y } = hexToPixel(q, r);
    this._x = x - this._width / (2 * this._zoom);
    this._y = y - this._height / (2 * this._zoom);
    this._dirty = true;
    this._visibleRangeDirty = true;
  }

  /** Set zoom level directly (clamped). */
  setZoom(zoom: number): void {
    const centerWorldX = this._x + this._width / (2 * this._zoom);
    const centerWorldY = this._y + this._height / (2 * this._zoom);

    this._zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

    this._x = centerWorldX - this._width / (2 * this._zoom);
    this._y = centerWorldY - this._height / (2 * this._zoom);

    this._dirty = true;
    this._visibleRangeDirty = true;
  }

  // ── Coordinate Transforms ────────────────────────────────

  /** Convert screen coordinates to world coordinates. */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: this._x + screenX / this._zoom,
      y: this._y + screenY / this._zoom,
    };
  }

  /** Convert world coordinates to screen coordinates. */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this._x) * this._zoom,
      y: (worldY - this._y) * this._zoom,
    };
  }

  /** Convert screen pixel position to the hex coordinate under it. */
  screenToHex(screenX: number, screenY: number): HexCoord {
    const world = this.screenToWorld(screenX, screenY);
    return pixelToHexRounded(world.x, world.y);
  }

  // ── Viewport Culling ──────────────────────────────────────

  /** Get the range of hex coordinates currently visible. */
  getVisibleRange(): VisibleRange {
    if (this._visibleRangeDirty) {
      const worldW = this._width / this._zoom;
      const worldH = this._height / this._zoom;
      this._visibleRange = getVisibleHexRange(
        this._x,
        this._y,
        worldW,
        worldH,
        2, // padding
      );
      this._visibleRangeDirty = false;
    }
    return this._visibleRange;
  }

  /** Check if a hex is within the current visible range. */
  isHexVisible(q: number, r: number): boolean {
    const range = this.getVisibleRange();
    return (
      q >= range.minQ &&
      q <= range.maxQ &&
      r >= range.minR &&
      r <= range.maxR
    );
  }

  // ── Canvas Transform ──────────────────────────────────────

  /**
   * Apply the viewport transform to a canvas 2D context.
   * Call this before any world-space drawing.
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(
      this._zoom * this._dpr, 0,
      0, this._zoom * this._dpr,
      -this._x * this._zoom * this._dpr,
      -this._y * this._zoom * this._dpr,
    );
  }

  /** Reset the canvas transform to identity (for screen-space UI). */
  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
  }
}
