'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Energy Panel
// Tactical energy bar with animated fill & regeneration
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

export default function EnergyPanel() {
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const energyRegenRate = useGameStore((s) => s.energyRegenRate);

  const pct = Math.round((energy / maxEnergy) * 100);
  const isLow = pct <= 20;
  const isFull = pct >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* ── Label Row ── */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="font-heading text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          Energy Protocol
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: isLow ? 'var(--warning)' : 'var(--accent-cyan)' }}
        >
          +{energyRegenRate}/s
        </span>
      </div>

      {/* ── Energy Bar ── */}
      <div className={`energy-bar-track rounded-sm ${isLow ? 'energy-bar-low' : ''}`}>
        <div
          className="energy-bar-fill"
          style={{
            width: `${pct}%`,
            ...(isLow ? {} : {}),
            boxShadow: isLow
              ? '0 0 8px rgba(255, 51, 51, 0.3)'
              : isFull
                ? '0 0 12px rgba(0, 255, 204, 0.4)'
                : '0 0 6px rgba(0, 255, 204, 0.2)',
          }}
        />
      </div>

      {/* ── Numeric Display ── */}
      <div className="flex items-center justify-between mt-1.5">
        <span
          className="font-mono text-sm font-bold"
          style={{
            color: isLow ? 'var(--warning)' : 'var(--text-primary)',
            textShadow: isLow ? '0 0 6px rgba(255,51,51,0.4)' : undefined,
          }}
        >
          {Math.floor(energy)}
          <span style={{ color: 'var(--text-tertiary)' }}> / {maxEnergy}</span>
          <span
            className="text-[10px] ml-1 tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            EP
          </span>
        </span>

        {/* Status indicator */}
        {isLow && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="font-heading text-[9px] tracking-[0.2em] uppercase"
            style={{ color: 'var(--warning)' }}
          >
            ⚠ LOW POWER
          </motion.span>
        )}
        {isFull && (
          <span
            className="font-heading text-[9px] tracking-[0.2em] uppercase"
            style={{ color: 'var(--success)' }}
          >
            ● CHARGED
          </span>
        )}
      </div>
    </motion.div>
  );
}
