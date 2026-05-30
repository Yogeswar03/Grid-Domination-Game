'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Scanline Overlay
// CRT-style full-screen atmospheric effects
// ═══════════════════════════════════════════════════════════════

export default function ScanlineOverlay() {
  return (
    <div className="scanline-overlay" aria-hidden="true">
      {/* Repeating horizontal scanlines */}
      <div className="scanline-lines" />

      {/* Animated scanline sweep beam */}
      <div className="scanline-sweep" />

      {/* Fractal noise texture */}
      <div className="noise-overlay" />

      {/* CRT vignette darkening at edges */}
      <div className="vignette-overlay" />
    </div>
  );
}
