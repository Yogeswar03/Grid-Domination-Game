'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Player Stats
// Operator status display with tactical metrics
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

interface StatRowProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

function StatRow({ label, value, accent }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className="font-heading text-[10px] tracking-[0.18em] uppercase"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <span
        className="font-mono text-xs"
        style={{
          color: accent ? 'var(--accent-cyan)' : 'var(--text-primary)',
          textShadow: accent ? '0 0 6px rgba(0,255,204,0.3)' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function PlayerStats() {
  const username = useGameStore((s) => s.username);
  const color = useGameStore((s) => s.color);
  const playerId = useGameStore((s) => s.playerId);
  const tiles = useGameStore((s) => s.tiles);
  const leaderboard = useGameStore((s) => s.leaderboard);

  const stats = useMemo(() => {
    if (!playerId) return { territory: 0, influence: 0, attackWins: 0, domPct: 0 };

    let territory = 0;
    let totalOwned = 0;
    tiles.forEach((tile) => {
      if (tile.ownerId) {
        totalOwned++;
        if (tile.ownerId === playerId) territory++;
      }
    });

    const playerScore = leaderboard.find((p) => p.id === playerId);

    return {
      territory,
      domPct: totalOwned > 0 ? ((territory / totalOwned) * 100).toFixed(1) : '0.0',
    };
  }, [playerId, tiles]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Operator Identity ── */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}88, 0 0 16px ${color}33`,
          }}
        />
        <span
          className="font-heading text-sm font-semibold tracking-wider uppercase truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {username || 'UNREGISTERED'}
        </span>
      </div>

      {/* ── Stat Grid ── */}
      <div
        className="border-t pt-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <StatRow label="Sectors Painted" value={stats.territory} accent />
        <StatRow label="Domination" value={`${stats.domPct}%`} accent />
      </div>
    </motion.div>
  );
}
