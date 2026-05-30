// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Hex Math (Flat-Top Orientation)
// ═══════════════════════════════════════════════════════════════
// All math follows the "flat-top" axial coordinate convention.
// Reference: https://www.redblobgames.com/grids/hexagons/

import { GAME_CONFIG, type HexCoord } from '@/types/game';

// ── Constants ─────────────────────────────────────────────────

const SQRT3 = Math.sqrt(3);
const HEX_SIZE = GAME_CONFIG.HEX_SIZE;

/** Width of a single flat-top hex (point-to-point horizontally). */
export const HEX_WIDTH = HEX_SIZE * 2;

/** Height of a single flat-top hex. */
export const HEX_HEIGHT = SQRT3 * HEX_SIZE;

/** Horizontal step between column centers. */
export const HEX_HORIZ = HEX_SIZE * 1.5;

/** Vertical step between row centers. */
export const HEX_VERT = HEX_HEIGHT;

// ── Axial Directions (flat-top) ───────────────────────────────

/** The six axial neighbor offsets for a flat-top hex grid. */
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
] as const;

// ── Coordinate Conversions ────────────────────────────────────

/** Convert axial (q, r) → pixel (x, y) for flat-top hex. */
export function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * q;
  const y = HEX_SIZE * (SQRT3 / 2 * q + SQRT3 * r);
  return { x, y };
}

/** Convert pixel (x, y) → fractional axial (q, r) for flat-top hex. */
export function pixelToHex(px: number, py: number): { q: number; r: number } {
  const q = (2 / 3 * px) / HEX_SIZE;
  const r = (-1 / 3 * px + SQRT3 / 3 * py) / HEX_SIZE;
  return { q, r };
}

// ── Rounding ──────────────────────────────────────────────────

/** Round fractional axial coordinates to the nearest hex. */
export function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  }
  // else rs would be recalculated, but we only need q, r

  return { q: rq, r: rr };
}

/** Convert a pixel position to the nearest hex coordinate. */
export function pixelToHexRounded(px: number, py: number): HexCoord {
  const { q, r } = pixelToHex(px, py);
  return hexRound(q, r);
}

// ── Distance & Neighbors ──────────────────────────────────────

/** Axial distance between two hexes (Manhattan-like). */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr;  // implicit s component
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

/** Get all six neighbors of a hex. */
export function hexNeighbors(q: number, r: number): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

/** Check whether a coordinate is within the map bounds [0, size). */
export function isInBounds(q: number, r: number, mapSize: number = GAME_CONFIG.MAP_SIZE): boolean {
  return q >= 0 && q < mapSize && r >= 0 && r < mapSize;
}

// ── Hex Key ───────────────────────────────────────────────────

/** Create a unique string key for a hex coordinate (for Map lookups). */
export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

/** Parse a hex key back into coordinates. */
export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

// ── Path2D Geometry ───────────────────────────────────────────

/**
 * Build the six corner points of a flat-top hex centered at (cx, cy).
 * Corners go clockwise from the right-most point.
 */
export function hexCorners(cx: number, cy: number, size: number = HEX_SIZE): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i; // flat-top: first corner at 0°
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: cx + size * Math.cos(angleRad),
      y: cy + size * Math.sin(angleRad),
    });
  }
  return corners;
}

/**
 * Create a Path2D for a flat-top hex centered at (cx, cy).
 * Optionally provide a pre-allocated path to avoid GC pressure.
 */
export function createHexPath(cx: number, cy: number, size: number = HEX_SIZE): Path2D {
  const path = new Path2D();
  const corners = hexCorners(cx, cy, size);
  path.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) {
    path.lineTo(corners[i].x, corners[i].y);
  }
  path.closePath();
  return path;
}

// ── Range / Ring / Spiral ─────────────────────────────────────

/** Get all hexes within `radius` of center (inclusive). */
export function hexRange(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let dq = -radius; dq <= radius; dq++) {
    const rMin = Math.max(-radius, -dq - radius);
    const rMax = Math.min(radius, -dq + radius);
    for (let dr = rMin; dr <= rMax; dr++) {
      results.push({ q: center.q + dq, r: center.r + dr });
    }
  }
  return results;
}

/** Get all hexes on a ring of `radius` around center. */
export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [{ q: center.q, r: center.r }];

  const results: HexCoord[] = [];
  let hex: HexCoord = {
    q: center.q + HEX_DIRECTIONS[4].q * radius,
    r: center.r + HEX_DIRECTIONS[4].r * radius,
  };

  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      results.push(hex);
      hex = {
        q: hex.q + HEX_DIRECTIONS[side].q,
        r: hex.r + HEX_DIRECTIONS[side].r,
      };
    }
  }
  return results;
}

/** Draw a straight line between two hexes using linear interpolation. */
export function hexLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const N = hexDistance(a, b);
  if (N === 0) return [{ q: a.q, r: a.r }];

  const results: HexCoord[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const q = a.q + (b.q - a.q) * t;
    const r = a.r + (b.r - a.r) * t;
    results.push(hexRound(q, r));
  }
  return results;
}

// ── Visible Hex Range (Viewport Culling) ──────────────────────

export interface VisibleRange {
  minQ: number;
  maxQ: number;
  minR: number;
  maxR: number;
}

/**
 * Determine the range of hex coordinates visible within a viewport.
 * @param vpX - Viewport left in world-space
 * @param vpY - Viewport top in world-space
 * @param vpW - Viewport width in world-space
 * @param vpH - Viewport height in world-space
 * @param padding - Extra hexes to include around the edges
 */
export function getVisibleHexRange(
  vpX: number,
  vpY: number,
  vpW: number,
  vpH: number,
  padding: number = 2,
): VisibleRange {
  // Convert viewport corners to fractional hex coordinates
  const topLeft = pixelToHex(vpX, vpY);
  const topRight = pixelToHex(vpX + vpW, vpY);
  const bottomLeft = pixelToHex(vpX, vpY + vpH);
  const bottomRight = pixelToHex(vpX + vpW, vpY + vpH);

  const minQ = Math.floor(Math.min(topLeft.q, topRight.q, bottomLeft.q, bottomRight.q)) - padding;
  const maxQ = Math.ceil(Math.max(topLeft.q, topRight.q, bottomLeft.q, bottomRight.q)) + padding;
  const minR = Math.floor(Math.min(topLeft.r, topRight.r, bottomLeft.r, bottomRight.r)) - padding;
  const maxR = Math.ceil(Math.max(topLeft.r, topRight.r, bottomLeft.r, bottomRight.r)) + padding;

  return { minQ, maxQ, minR, maxR };
}
