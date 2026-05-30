'use client';

// ═══════════════════════════════════════════════════════════════
// HEX PAINT WARS — Sidebar Leaderboard
// Clean flat sidebar showing player dominance rankings in real-time
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import TacticalButton from '@/components/ui/TacticalButton';

interface LeaderboardProps {
  onClose: () => void;
}

export default function Leaderboard({ onClose }: LeaderboardProps) {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const playerId = useGameStore((s) => s.playerId);

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 z-40 w-80 border-l flex flex-col font-mono text-[var(--text-primary)] pointer-events-auto shadow-2xl"
      style={{
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(8px)',
        borderColor: 'var(--border-subtle)',
        paddingTop: '64px', // Space below the top bar
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b" 
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="online-dot" />
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--accent-cyan)]">
            DOMINANCE LEADERBOARD
          </h2>
        </div>
        <TacticalButton variant="ghost" size="sm" onClick={onClose} className="!px-2 !py-0.5 !text-[10px]">
          CLOSE ✕
        </TacticalButton>
      </div>

      {/* Rankings List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
        {leaderboard.length === 0 ? (
          <div
            className="text-[10px] text-center py-12 tracking-wider text-[var(--text-tertiary)]"
          >
            ── NO OPERATORS CONNECTED ──
          </div>
        ) : (
          leaderboard.map((player, index) => {
            const isSelf = player.id === playerId;
            const rank = index + 1;

            return (
              <div
                key={player.id}
                className="p-2.5 rounded-sm border flex items-center justify-between gap-2 transition-all"
                style={{
                  background: isSelf ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.3)',
                  borderColor: isSelf ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                }}
              >
                {/* Left: Rank & Color Badge & Callsign */}
                <div className="flex items-center gap-2 min-w-0">
                  <span 
                    className="text-xs font-bold w-4 text-center"
                    style={{
                      color: rank === 1 ? '#ffcc00' : rank === 2 ? '#94a3b8' : rank === 3 ? '#cd7f32' : 'var(--text-secondary)'
                    }}
                  >
                    #{rank}
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: player.color,
                      boxShadow: `0 0 6px ${player.color}40`,
                    }}
                  />
                  <span
                    className="text-xs font-bold truncate text-ellipsis tracking-wide"
                    style={{ color: isSelf ? 'var(--accent-cyan)' : 'var(--text-primary)' }}
                  >
                    {player.username} {isSelf && <span className="text-[9px] text-[var(--text-secondary)] font-normal">(YOU)</span>}
                  </span>
                </div>

                {/* Right: Score */}
                <div className="flex flex-col items-end flex-shrink-0 font-mono">
                  <span className="text-xs font-bold text-[var(--accent-cyan)]">
                    {player.territory} <span className="text-[9px] text-[var(--text-secondary)] font-normal">Sectors</span>
                  </span>
                  <span className="text-[9px] text-[var(--text-tertiary)] mt-0.5">
                    {player.dominationPct.toFixed(1)}% Grid
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div 
        className="p-3 border-t text-center text-[9px] text-[var(--text-tertiary)] tracking-widest uppercase"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        Real-time grid updates
      </div>
    </motion.div>
  );
}
