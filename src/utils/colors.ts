// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Color Utilities
// ═══════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────

export interface RGBA {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

// ── Parse / Format ────────────────────────────────────────────

const parseCache = new Map<string, RGBA>();

/** Parse a hex color string (#RGB, #RRGGBB, #RRGGBBAA) to RGBA. */
export function parseHex(hex: string): RGBA {
  const cached = parseCache.get(hex);
  if (cached) return cached;

  let cleaned = hex.startsWith('#') ? hex.slice(1) : hex;

  // Expand shorthand (#RGB → #RRGGBB)
  if (cleaned.length === 3) {
    cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
  }

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const a = cleaned.length === 8 ? parseInt(cleaned.slice(6, 8), 16) / 255 : 1;

  const result = { r, g, b, a };
  parseCache.set(hex, result);
  return result;
}

/** Format RGBA values to a CSS rgba() string. */
export function rgbaString(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(3)})`;
}

/** Convert RGBA object to CSS string. */
export function rgbaToString(rgba: RGBA): string {
  return rgbaString(rgba.r, rgba.g, rgba.b, rgba.a);
}

// ── Transformations ───────────────────────────────────────────

/**
 * Convert a hex color to an rgba() string with the given alpha.
 * Most common operation — heavily optimized with caching.
 */
const hexToRgbaCache = new Map<string, string>();

export function hexToRgba(hex: string, alpha: number): string {
  const key = `${hex}:${alpha.toFixed(3)}`;
  const cached = hexToRgbaCache.get(key);
  if (cached) return cached;

  const { r, g, b } = parseHex(hex);
  const result = rgbaString(r, g, b, alpha);
  hexToRgbaCache.set(key, result);
  return result;
}

/** Apply alpha to any color string (hex). */
export function withAlpha(color: string, alpha: number): string {
  return hexToRgba(color, alpha);
}

/**
 * Darken a hex color by a factor (0 = unchanged, 1 = black).
 * @param hex - Source color
 * @param amount - Darkening factor [0, 1]
 */
export function darken(hex: string, amount: number): string {
  const { r, g, b, a } = parseHex(hex);
  const factor = 1 - Math.min(1, Math.max(0, amount));
  return rgbaString(r * factor, g * factor, b * factor, a);
}

/**
 * Lighten a hex color by a factor (0 = unchanged, 1 = white).
 * @param hex - Source color
 * @param amount - Lightening factor [0, 1]
 */
export function lighten(hex: string, amount: number): string {
  const { r, g, b, a } = parseHex(hex);
  const amt = Math.min(1, Math.max(0, amount));
  return rgbaString(
    r + (255 - r) * amt,
    g + (255 - g) * amt,
    b + (255 - b) * amt,
    a,
  );
}

/**
 * Linearly interpolate between two hex colors.
 * @param t - Interpolation factor [0, 1]
 */
export function lerpColor(hexA: string, hexB: string, t: number): string {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const ct = Math.min(1, Math.max(0, t));
  return rgbaString(
    a.r + (b.r - a.r) * ct,
    a.g + (b.g - a.g) * ct,
    a.b + (b.b - a.b) * ct,
    a.a + (b.a - a.a) * ct,
  );
}

// ── Theme Colors ──────────────────────────────────────────────

export const THEME = {
  /** Background behind everything */
  BG_DARK: '#080c14',

  /** Neutral tile fill */
  TILE_NEUTRAL: '#0d1117',

  /** Neutral tile border */
  TILE_BORDER: '#1a2332',

  /** Grid line color */
  GRID_LINE: '#0f1923',

  /** Hover highlight overlay */
  HOVER_FILL: 'rgba(255,255,255,0.08)',
  HOVER_STROKE: 'rgba(255,255,255,0.25)',

  /** Selection indicator */
  SELECTION_STROKE: '#ffffff',

  /** Contested tile pulse colors */
  CONTESTED_ALPHA_MIN: 0.3,
  CONTESTED_ALPHA_MAX: 0.7,

  /** Effect colors */
  RIPPLE_BASE_ALPHA: 0.6,
  GLOW_BASE_ALPHA: 0.35,
  INFLUENCE_ALPHA: 0.15,
} as const;

// ── Player Color Palette ──────────────────────────────────────

/** Pre-defined player colors that look good on dark backgrounds. */
export const PLAYER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#8b5cf6', // violet
] as const;
