// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Hex Renderer (Individual Hex Drawing)
// ═══════════════════════════════════════════════════════════════

import { GAME_CONFIG, type TileData, type HexCoord } from '@/types/game';
import { hexToPixel, createHexPath, hexCorners } from '@/utils/hexMath';
import { THEME, hexToRgba, darken, lighten } from '@/utils/colors';
import { ViewportManager } from './ViewportManager';

const HEX_SIZE = GAME_CONFIG.HEX_SIZE;

// ── Color Batch Entry ─────────────────────────────────────────

interface ColorBatch {
  fillColor: string;
  path: Path2D;
}

// ── HexRenderer ───────────────────────────────────────────────

export class HexRenderer {
  /** Cache of Path2D objects by "q,r" to avoid re-creating them. */
  private pathCache: Map<string, Path2D> = new Map();

  /** Reusable corner buffer. */
  private cornerBuf: { x: number; y: number }[] = [];

  // ── Path Cache ────────────────────────────────────────────

  getHexPath(q: number, r: number): Path2D {
    const key = `${q},${r}`;
    let path = this.pathCache.get(key);
    if (!path) {
      const { x, y } = hexToPixel(q, r);
      path = createHexPath(x, y, HEX_SIZE);
      this.pathCache.set(key, path);
    }
    return path;
  }

  /** Pre-warm the path cache for a range of hexes. */
  warmCache(minQ: number, maxQ: number, minR: number, maxR: number): void {
    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        this.getHexPath(q, r);
      }
    }
  }

  // ── Tile Color Resolution ─────────────────────────────────

  /**
   * Determine the fill color for a tile based on its state.
   * @param now - Current time for animation (contested pulse)
   */
  getTileFillColor(tile: TileData, now: number): string {
    switch (tile.state) {
      case 'neutral':
        return THEME.TILE_NEUTRAL;

      case 'owned': {
        if (!tile.ownerColor) return THEME.TILE_NEUTRAL;
        // Smoothly fade tile color opacity over 10 seconds of lifetime
        const elapsed = now - tile.lastUpdated;
        const lifetime = 10000; // 10s decay duration
        const progress = Math.max(0, Math.min(1, elapsed / lifetime));
        const alpha = Math.max(0.15, 1 - progress); // Maintain at least 0.15 alpha so it is slightly visible until wiped
        return hexToRgba(tile.ownerColor, alpha);
      }

      default:
        return THEME.TILE_NEUTRAL;
    }
  }

  /**
   * Determine the border color for a tile.
   */
  getTileBorderColor(tile: TileData): string {
    if (tile.state === 'owned' && tile.ownerColor) {
      return hexToRgba(tile.ownerColor, 0.5);
    }
    if (tile.state === 'contested' && tile.ownerColor) {
      return hexToRgba(tile.ownerColor, 0.35);
    }
    return THEME.TILE_BORDER;
  }

  // ── Batched Tile Rendering ────────────────────────────────

  /**
   * Render tiles using color batching — groups tiles by fill color
   * and draws each group in a single fill() call.
   */
  renderTilesBatched(
    ctx: CanvasRenderingContext2D,
    tiles: TileData[],
    now: number,
    viewport: ViewportManager,
  ): void {
    // Group tiles by fill color
    const batches = new Map<string, Path2D>();

    for (const tile of tiles) {
      const fillColor = this.getTileFillColor(tile, now);
      let batchPath = batches.get(fillColor);
      if (!batchPath) {
        batchPath = new Path2D();
        batches.set(fillColor, batchPath);
      }
      batchPath.addPath(this.getHexPath(tile.q, tile.r));
    }

    // Draw each color batch in a single call
    for (const [color, path] of batches) {
      ctx.fillStyle = color;
      ctx.fill(path);
    }

    // Draw borders — batch neutral vs. owned separately
    const neutralBorderPath = new Path2D();
    const ownedBorderPaths = new Map<string, Path2D>();

    for (const tile of tiles) {
      const borderColor = this.getTileBorderColor(tile);
      if (borderColor === THEME.TILE_BORDER) {
        neutralBorderPath.addPath(this.getHexPath(tile.q, tile.r));
      } else {
        let borderPath = ownedBorderPaths.get(borderColor);
        if (!borderPath) {
          borderPath = new Path2D();
          ownedBorderPaths.set(borderColor, borderPath);
        }
        borderPath.addPath(this.getHexPath(tile.q, tile.r));
      }
    }

    const lineWidth = Math.max(0.5, 1 / viewport.zoom);
    ctx.lineWidth = lineWidth;

    // Draw neutral borders
    ctx.strokeStyle = THEME.TILE_BORDER;
    ctx.stroke(neutralBorderPath);

    // Draw owned borders
    for (const [color, path] of ownedBorderPaths) {
      ctx.strokeStyle = color;
      ctx.stroke(path);
    }
  }

  // ── Single Tile ───────────────────────────────────────────

  /** Render a single tile (used for hover highlight, selection, etc.). */
  renderSingleTile(
    ctx: CanvasRenderingContext2D,
    q: number,
    r: number,
    fillColor: string,
    strokeColor: string,
    lineWidth: number = 1,
  ): void {
    const path = this.getHexPath(q, r);
    ctx.fillStyle = fillColor;
    ctx.fill(path);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke(path);
  }

  // ── Hover Highlight ───────────────────────────────────────

  renderHover(ctx: CanvasRenderingContext2D, hex: HexCoord, zoom: number): void {
    const path = this.getHexPath(hex.q, hex.r);
    ctx.fillStyle = THEME.HOVER_FILL;
    ctx.fill(path);
    ctx.strokeStyle = THEME.HOVER_STROKE;
    ctx.lineWidth = Math.max(1, 2 / zoom);
    ctx.stroke(path);
  }

  // ── Selection Indicator ───────────────────────────────────

  renderSelection(ctx: CanvasRenderingContext2D, hex: HexCoord, now: number, zoom: number): void {
    const { x, y } = hexToPixel(hex.q, hex.r);

    // Pulsing outer ring
    const pulse = (Math.sin(now * 0.004) + 1) / 2; // 0..1
    const outerSize = HEX_SIZE + 2 + pulse * 3;
    const outerPath = createHexPath(x, y, outerSize);

    ctx.strokeStyle = hexToRgba(THEME.SELECTION_STROKE, 0.4 + pulse * 0.4);
    ctx.lineWidth = Math.max(1.5, 2.5 / zoom);
    ctx.stroke(outerPath);

    // Inner ring (solid)
    const path = this.getHexPath(hex.q, hex.r);
    ctx.strokeStyle = THEME.SELECTION_STROKE;
    ctx.lineWidth = Math.max(1, 2 / zoom);
    ctx.stroke(path);
  }

  // ── Territory Edge Glow ───────────────────────────────────

  /**
   * Render a glowing edge on tiles that border enemy/neutral territory.
   * @param edgeTiles - Tiles that are on the territory border
   */
  renderTerritoryEdges(
    ctx: CanvasRenderingContext2D,
    edgeTiles: TileData[],
    now: number,
    zoom: number,
  ): void {
    if (edgeTiles.length === 0) return;

    // Group by owner color
    const groups = new Map<string, Path2D>();

    for (const tile of edgeTiles) {
      if (!tile.ownerColor) continue;
      let path = groups.get(tile.ownerColor);
      if (!path) {
        path = new Path2D();
        groups.set(tile.ownerColor, path);
      }
      path.addPath(this.getHexPath(tile.q, tile.r));
    }

    // Pulse the glow
    const glowPulse = (Math.sin(now * 0.002) + 1) / 2;
    const glowAlpha = THEME.GLOW_BASE_ALPHA + glowPulse * 0.15;

    ctx.save();
    ctx.lineWidth = Math.max(2, 3 / zoom);

    for (const [color, path] of groups) {
      ctx.strokeStyle = hexToRgba(color, glowAlpha);
      ctx.shadowColor = color;
      ctx.shadowBlur = 8 / zoom;
      ctx.stroke(path);
    }

    ctx.restore();
  }

  // ── Cleanup ───────────────────────────────────────────────

  clearCache(): void {
    this.pathCache.clear();
  }
}
