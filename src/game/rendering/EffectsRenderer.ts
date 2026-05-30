// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Effects Renderer
// ═══════════════════════════════════════════════════════════════
// Manages and renders visual effects: capture ripples, influence
// pulses, and territory edge glow animations.

import { GAME_CONFIG, type RippleEffect, type PulseEffect, type HexCoord } from '@/types/game';
import { hexToPixel, createHexPath, hexRing, HEX_HEIGHT } from '@/utils/hexMath';
import { hexToRgba, THEME } from '@/utils/colors';
import { ViewportManager } from './ViewportManager';

const HEX_SIZE = GAME_CONFIG.HEX_SIZE;

// ── Constants ─────────────────────────────────────────────────

const DEFAULT_RIPPLE_DURATION = 800; // ms
const MAX_RIPPLE_RADIUS = 4; // in hex cells
const MAX_ACTIVE_EFFECTS = 50; // hard cap to prevent performance issues

// ── EffectsRenderer ───────────────────────────────────────────

export class EffectsRenderer {
  /** Active capture ripple effects. */
  private ripples: RippleEffect[] = [];

  /** Active pulse effects (persistent until removed). */
  private pulses: PulseEffect[] = [];

  /** Whether any effects are currently active. */
  get hasActiveEffects(): boolean {
    return this.ripples.length > 0 || this.pulses.length > 0;
  }

  // ── Effect Queuing ────────────────────────────────────────

  /**
   * Add a capture ripple effect at the given hex.
   * Multiple ripples can play simultaneously.
   */
  addRipple(q: number, r: number, color: string, duration: number = DEFAULT_RIPPLE_DURATION): void {
    if (this.ripples.length >= MAX_ACTIVE_EFFECTS) {
      // Remove oldest ripple to make room
      this.ripples.shift();
    }

    this.ripples.push({
      q,
      r,
      color,
      startTime: performance.now(),
      duration,
    });
  }

  /**
   * Add or update a pulse effect at the given hex.
   * Pulses persist until explicitly removed.
   */
  addPulse(q: number, r: number, color: string): void {
    // Don't duplicate
    const existing = this.pulses.find((p) => p.q === q && p.r === r);
    if (existing) {
      existing.color = color;
      return;
    }

    if (this.pulses.length >= MAX_ACTIVE_EFFECTS) {
      this.pulses.shift();
    }

    this.pulses.push({ q, r, color, phase: Math.random() * Math.PI * 2 });
  }

  /** Remove a pulse effect at the given hex. */
  removePulse(q: number, r: number): void {
    this.pulses = this.pulses.filter((p) => p.q !== q || p.r !== r);
  }

  /** Clear all effects. */
  clearAll(): void {
    this.ripples = [];
    this.pulses = [];
  }

  // ── Update (Prune Expired) ────────────────────────────────

  /**
   * Prune completed ripples. Call once per frame.
   * @returns true if any effects were removed.
   */
  update(now: number): boolean {
    const prevCount = this.ripples.length;
    this.ripples = this.ripples.filter(
      (r) => now - r.startTime < r.duration,
    );
    return this.ripples.length !== prevCount;
  }

  // ── Render ────────────────────────────────────────────────

  /**
   * Render all active effects.
   * Must be called with the viewport transform already applied.
   */
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportManager,
    now: number,
  ): void {
    this.renderRipples(ctx, viewport, now);
    this.renderPulses(ctx, viewport, now);
  }

  // ── Capture Ripple ────────────────────────────────────────

  private renderRipples(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportManager,
    now: number,
  ): void {
    for (const ripple of this.ripples) {
      const elapsed = now - ripple.startTime;
      const progress = Math.max(0, Math.min(0.999, elapsed / ripple.duration));

      const { x: cx, y: cy } = hexToPixel(ripple.q, ripple.r);

      // Expanding ring
      const maxRadius = HEX_SIZE * MAX_RIPPLE_RADIUS;
      const currentRadius = maxRadius * easeOutCubic(progress);
      const alpha = THEME.RIPPLE_BASE_ALPHA * (1 - progress);

      ctx.save();

      // Outer ring (expanding)
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, currentRadius), 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(ripple.color, alpha);
      ctx.lineWidth = Math.max(1, (3 - progress * 2)) / viewport.zoom;
      ctx.stroke();

      // Inner flash (fading quickly)
      if (progress < 0.3) {
        const flashAlpha = alpha * 2 * (1 - progress / 0.3);
        const flashPath = createHexPath(cx, cy, HEX_SIZE * (1 + progress * 0.5));
        ctx.fillStyle = hexToRgba(ripple.color, Math.min(flashAlpha, 0.5));
        ctx.fill(flashPath);
      }

      // Secondary ring (delayed, thinner)
      if (progress > 0.15 && progress < 0.8) {
        const secondaryProgress = Math.max(0, Math.min(0.999, (progress - 0.15) / 0.65));
        const secondaryRadius = maxRadius * 0.6 * easeOutCubic(secondaryProgress);
        const secondaryAlpha = alpha * 0.4 * (1 - secondaryProgress);

        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0, secondaryRadius), 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(ripple.color, secondaryAlpha);
        ctx.lineWidth = Math.max(0.5, 1.5 / viewport.zoom);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // ── Influence Pulse ───────────────────────────────────────

  private renderPulses(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportManager,
    now: number,
  ): void {
    for (const pulse of this.pulses) {
      if (!viewport.isHexVisible(pulse.q, pulse.r)) continue;

      const { x: cx, y: cy } = hexToPixel(pulse.q, pulse.r);
      const phase = now * 0.003 + pulse.phase;
      const pulseValue = (Math.sin(phase) + 1) / 2; // 0..1

      // Subtle glow around the hex
      const glowRadius = HEX_SIZE * (1.2 + pulseValue * 0.3);

      ctx.save();

      // Radial glow
      const gradient = ctx.createRadialGradient(
        cx, cy, HEX_SIZE * 0.5,
        cx, cy, Math.max(0, glowRadius),
      );
      gradient.addColorStop(0, hexToRgba(pulse.color, 0.15 * pulseValue));
      gradient.addColorStop(1, hexToRgba(pulse.color, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, glowRadius), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ── Stats ─────────────────────────────────────────────────

  get activeRippleCount(): number {
    return this.ripples.length;
  }

  get activePulseCount(): number {
    return this.pulses.length;
  }
}

// ── Easing Functions ──────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
