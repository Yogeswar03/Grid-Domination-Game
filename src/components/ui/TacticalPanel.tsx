'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Tactical Panel
// Reusable container with corner bracket decorations & glow
// ═══════════════════════════════════════════════════════════════

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface TacticalPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  cornerBrackets?: boolean;
  glowing?: boolean;
  compact?: boolean;
}

export default function TacticalPanel({
  title,
  children,
  className = '',
  cornerBrackets = true,
  glowing = true,
  compact = false,
}: TacticalPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
      className={`
        tactical-panel
        ${glowing ? 'glow-pulse' : ''}
        ${cornerBrackets ? '' : 'no-brackets'}
        ${className}
      `}
      style={{
        // Inline overrides for non-bracket mode
        ...(cornerBrackets ? {} : { '--brackets-display': 'none' } as React.CSSProperties),
      }}
    >
      {/* ── Corner Brackets (top-right & bottom-left via inner elements) ── */}
      {cornerBrackets && (
        <>
          <div
            className="absolute top-[-1px] right-[-1px] w-[14px] h-[14px] pointer-events-none"
            style={{
              borderTop: '1px solid var(--accent-cyan)',
              borderRight: '1px solid var(--accent-cyan)',
              opacity: 0.6,
            }}
          />
          <div
            className="absolute bottom-[-1px] left-[-1px] w-[14px] h-[14px] pointer-events-none"
            style={{
              borderBottom: '1px solid var(--accent-cyan)',
              borderLeft: '1px solid var(--accent-cyan)',
              opacity: 0.6,
            }}
          />
        </>
      )}

      {/* ── Title Bar ── */}
      {title && (
        <div className="tactical-panel-title">
          {title}
        </div>
      )}

      {/* ── Content ── */}
      <div className={compact ? 'p-2' : 'p-3'}>
        {children}
      </div>
    </motion.div>
  );
}
