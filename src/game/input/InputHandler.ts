// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Input Handler (Mouse / Touch)
// ═══════════════════════════════════════════════════════════════

import type { HexCoord } from '@/types/game';
import { ViewportManager } from '../rendering/ViewportManager';

// ── Types ─────────────────────────────────────────────────────

export interface InputCallbacks {
  /** Fired when the user clicks/taps a hex. */
  onHexClick?: (hex: HexCoord, event: MouseEvent | TouchEvent) => void;

  /** Fired when the hovered hex changes. */
  onHexHover?: (hex: HexCoord | null) => void;

  /** Fired when the user right-clicks a hex. */
  onHexRightClick?: (hex: HexCoord, event: MouseEvent) => void;

  /** Fired on zoom change. */
  onZoomChange?: (zoom: number) => void;
}

// ── InputHandler ──────────────────────────────────────────────

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private viewport: ViewportManager;
  private callbacks: InputCallbacks;

  /** Mouse state. */
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private dragMoved = false;

  /** Velocity tracking for inertia. */
  private velocitySamples: { dx: number; dy: number; dt: number }[] = [];
  private lastMoveTimestamp = 0;

  /** Touch state. */
  private lastTouchDistance = 0;
  private touchStartCount = 0;

  /** Current hovered hex. */
  private _hoveredHex: HexCoord | null = null;

  /** Threshold in pixels to distinguish click from drag. */
  private readonly DRAG_THRESHOLD = 4;

  /** Bound event handlers (for removal). */
  private boundHandlers: Map<string, EventListener> = new Map();

  constructor(
    canvas: HTMLCanvasElement,
    viewport: ViewportManager,
    callbacks: InputCallbacks = {},
  ) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.callbacks = callbacks;
    this.attach();
  }

  // ── Lifecycle ─────────────────────────────────────────────

  private attach(): void {
    const handlers: [string, EventListener, AddEventListenerOptions?][] = [
      ['mousedown', this.onMouseDown as EventListener],
      ['mousemove', this.onMouseMove as EventListener],
      ['mouseup', this.onMouseUp as EventListener],
      ['mouseleave', this.onMouseLeave as EventListener],
      ['wheel', this.onWheel as EventListener, { passive: false }],
      ['contextmenu', this.onContextMenu as EventListener],
      ['touchstart', this.onTouchStart as EventListener, { passive: false }],
      ['touchmove', this.onTouchMove as EventListener, { passive: false }],
      ['touchend', this.onTouchEnd as EventListener],
    ];

    for (const [event, handler, options] of handlers) {
      this.canvas.addEventListener(event, handler, options);
      this.boundHandlers.set(event, handler);
    }
  }

  destroy(): void {
    for (const [event, handler] of this.boundHandlers) {
      this.canvas.removeEventListener(event, handler);
    }
    this.boundHandlers.clear();
  }

  // ── Accessors ─────────────────────────────────────────────

  get hoveredHex(): HexCoord | null {
    return this._hoveredHex;
  }

  setCallbacks(cb: Partial<InputCallbacks>): void {
    Object.assign(this.callbacks, cb);
  }

  // ── Mouse Events ──────────────────────────────────────────

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0 && e.button !== 2) return; // left or right only

    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.lastMoveTimestamp = performance.now();
    this.velocitySamples = [];

    this.viewport.setPanVelocity(0, 0); // Stop any inertia
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      // Check if we've moved enough to consider it a drag
      const totalDx = e.clientX - this.dragStartX;
      const totalDy = e.clientY - this.dragStartY;
      if (Math.abs(totalDx) > this.DRAG_THRESHOLD || Math.abs(totalDy) > this.DRAG_THRESHOLD) {
        this.dragMoved = true;
      }

      if (this.dragMoved) {
        this.viewport.pan(dx, dy);

        // Record velocity sample for inertia
        const now = performance.now();
        const dt = now - this.lastMoveTimestamp;
        if (dt > 0) {
          this.velocitySamples.push({ dx, dy, dt });
          // Keep only last few samples
          if (this.velocitySamples.length > 5) {
            this.velocitySamples.shift();
          }
        }
        this.lastMoveTimestamp = now;
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else {
      // Update hover
      this.updateHover(screenX, screenY);
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.dragMoved) {
      // Apply inertia from velocity samples
      const velocity = this.computeVelocity();
      this.viewport.setPanVelocity(velocity.dx, velocity.dy);
    } else {
      // It was a click, not a drag
      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const hex = this.viewport.screenToHex(screenX, screenY);

      if (e.button === 0) {
        this.callbacks.onHexClick?.(hex, e);
      }
    }
  };

  private onMouseLeave = (_e: MouseEvent): void => {
    if (this.isDragging) {
      this.isDragging = false;
      const velocity = this.computeVelocity();
      this.viewport.setPanVelocity(velocity.dx, velocity.dy);
    }

    if (this._hoveredHex) {
      this._hoveredHex = null;
      this.callbacks.onHexHover?.(null);
    }
  };

  // ── Wheel (Zoom) ──────────────────────────────────────────

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    this.viewport.zoomAt(screenX, screenY, e.deltaY);

    // Update hover position after zoom
    this.updateHover(screenX, screenY);

    this.callbacks.onZoomChange?.(this.viewport.zoom);
  };

  // ── Context Menu ──────────────────────────────────────────

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const hex = this.viewport.screenToHex(screenX, screenY);

    this.callbacks.onHexRightClick?.(hex, e);
  };

  // ── Touch Events ──────────────────────────────────────────

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    this.touchStartCount = e.touches.length;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.isDragging = true;
      this.dragMoved = false;
      this.dragStartX = touch.clientX;
      this.dragStartY = touch.clientY;
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
      this.lastMoveTimestamp = performance.now();
      this.velocitySamples = [];
      this.viewport.setPanVelocity(0, 0);
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom start
      this.lastTouchDistance = this.getTouchDistance(e.touches);
      this.isDragging = false;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    if (e.touches.length === 1 && this.isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - this.lastMouseX;
      const dy = touch.clientY - this.lastMouseY;

      const totalDx = touch.clientX - this.dragStartX;
      const totalDy = touch.clientY - this.dragStartY;
      if (Math.abs(totalDx) > this.DRAG_THRESHOLD || Math.abs(totalDy) > this.DRAG_THRESHOLD) {
        this.dragMoved = true;
      }

      if (this.dragMoved) {
        this.viewport.pan(dx, dy);

        const now = performance.now();
        const dt = now - this.lastMoveTimestamp;
        if (dt > 0) {
          this.velocitySamples.push({ dx, dy, dt });
          if (this.velocitySamples.length > 5) this.velocitySamples.shift();
        }
        this.lastMoveTimestamp = now;
      }

      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom
      const newDist = this.getTouchDistance(e.touches);
      const delta = this.lastTouchDistance - newDist;

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = this.canvas.getBoundingClientRect();

      this.viewport.zoomAt(midX - rect.left, midY - rect.top, delta * 2);
      this.lastTouchDistance = newDist;
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length === 0) {
      if (this.isDragging) {
        this.isDragging = false;

        if (this.dragMoved) {
          const velocity = this.computeVelocity();
          this.viewport.setPanVelocity(velocity.dx, velocity.dy);
        } else if (this.touchStartCount === 1 && e.changedTouches.length === 1) {
          // Tap
          const touch = e.changedTouches[0];
          const rect = this.canvas.getBoundingClientRect();
          const screenX = touch.clientX - rect.left;
          const screenY = touch.clientY - rect.top;
          const hex = this.viewport.screenToHex(screenX, screenY);
          this.callbacks.onHexClick?.(hex, e);
        }
      }
    }
  };

  // ── Helpers ───────────────────────────────────────────────

  private updateHover(screenX: number, screenY: number): void {
    const hex = this.viewport.screenToHex(screenX, screenY);

    if (!this._hoveredHex || this._hoveredHex.q !== hex.q || this._hoveredHex.r !== hex.r) {
      this._hoveredHex = hex;
      this.callbacks.onHexHover?.(hex);
    }
  }

  private computeVelocity(): { dx: number; dy: number } {
    if (this.velocitySamples.length === 0) return { dx: 0, dy: 0 };

    let totalDx = 0;
    let totalDy = 0;
    let totalDt = 0;

    for (const sample of this.velocitySamples) {
      totalDx += sample.dx;
      totalDy += sample.dy;
      totalDt += sample.dt;
    }

    if (totalDt === 0) return { dx: 0, dy: 0 };

    // Normalize to per-frame velocity (16.67ms)
    const scale = 16.67 / totalDt * this.velocitySamples.length;
    return {
      dx: totalDx * scale,
      dy: totalDy * scale,
    };
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
