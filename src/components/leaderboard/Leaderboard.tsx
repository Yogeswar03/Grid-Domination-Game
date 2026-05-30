'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Leaderboard
// Dominion rankings overlay with tactical table styling
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import TacticalButton from '@/components/ui/TacticalButton';

interface LeaderboardProps {
  onClose: () => void;
}

const tableRowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function RankBadge({ rank }: { rank: number }) {
  const badges: Record<number, string> = { 1: '◆', 2: '◇', 3: '▪' };
  const colors: Record<number, string> = {
    1: '#ffcc00',
    2: '#c0c0c0',
    3: '#cd7f32',
  };

  if (rank <= 3) {
    return (
      <span style={{ color: colors[rank], textShadow: `0 0 6px ${colors[rank]}44` }}>
        {badges[rank]} {rank}
      </span>
    );
  }

  return <span style={{ color: 'var(--text-secondary)' }}>{rank}</span>;
}

export default function Leaderboard({ onClose }: LeaderboardProps) {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const playerId = useGameStore((s) => s.playerId);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="tactical-panel relative"
      style={{ width: 520, maxHeight: '80vh' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Corner brackets */}
      <div
        className="absolute top-[-1px] right-[-1px] w-[14px] h-[14px] pointer-events-none"
        style={{ borderTop: '1px solid var(--accent-cyan)', borderRight: '1px solid var(--accent-cyan)', opacity: 0.6 }}
      />
      <div
        className="absolute bottom-[-1px] left-[-1px] w-[14px] h-[14px] pointer-events-none"
        style={{ borderBottom: '1px solid var(--accent-cyan)', borderLeft: '1px solid var(--accent-cyan)', opacity: 0.6 }}
      />

      {/* ── Title Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2
          className="font-display text-sm font-bold tracking-[0.2em] uppercase neon-text"
        >
          Dominion Rankings
        </h2>
        <TacticalButton variant="ghost" size="sm" onClick={onClose} className="!px-2 !py-1">
          ✕
        </TacticalButton>
      </div>

      {/* ── Table ── */}
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
        {leaderboard.length === 0 ? (
          <div
            className="font-mono text-xs text-center py-12 tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ─── No dominion data available ───
            <br />
            <span className="text-[10px]">Territory captures will populate rankings</span>
          </div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>Rank</th>
                <th>Operator</th>
                <th style={{ width: 70, textAlign: 'right' }}>Territory</th>
                <th style={{ width: 70, textAlign: 'right' }}>Captures</th>
                <th style={{ width: 70, textAlign: 'right' }}>Influence</th>
                <th style={{ width: 60, textAlign: 'right' }}>Dom%</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, index) => {
                const isSelf = player.id === playerId;

                return (
                  <motion.tr
                    key={player.id}
                    custom={index}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    className={isSelf ? 'lb-self' : ''}
                  >
                    <td>
                      <RankBadge rank={index + 1} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: player.color,
                            boxShadow: isSelf
                              ? `0 0 8px ${player.color}88`
                              : `0 0 4px ${player.color}44`,
                          }}
                        />
                        <span
                          className="truncate"
                          style={{
                            color: isSelf ? 'var(--accent-cyan)' : 'var(--text-primary)',
                            fontWeight: isSelf ? 600 : 400,
                          }}
                        >
                          {player.username}
                          {isSelf && (
                            <span
                              className="ml-1.5 text-[9px] tracking-widest uppercase"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              (you)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--accent-cyan)' }}>{player.territory}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{player.captures}</td>
                    <td style={{ textAlign: 'right' }}>{player.influenceScore}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          color: player.dominationPct > 30
                            ? 'var(--success)'
                            : player.dominationPct > 10
                              ? 'var(--accent-cyan)'
                              : 'var(--text-primary)',
                        }}
                      >
                        {player.dominationPct.toFixed(1)}%
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="px-4 py-2 border-t text-center"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span
          className="font-mono text-[9px] tracking-wider uppercase"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Press TAB to close · Updated in real-time
        </span>
      </div>
    </motion.div>
  );
}
