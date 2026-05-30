'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — HUD Layout
// Main heads-up display container for all tactical overlays
// ═══════════════════════════════════════════════════════════════

import { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import PlayerStats from '@/components/hud/PlayerStats';
import EnergyPanel from '@/components/hud/EnergyPanel';
import ActivityFeed from '@/components/hud/ActivityFeed';
import OnlineUsers from '@/components/hud/OnlineUsers';
import Minimap from '@/components/minimap/Minimap';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import TacticalPanel from '@/components/ui/TacticalPanel';
import SectorIntel from '@/components/hud/SectorIntel';
import type { HexCoord } from '@/types/game';

export default function HUDLayout({
  viewportBounds,
  onNavigate,
  onHexAction,
  timeRemaining = 180,
  roundState = 'active',
  cooldownActive = false,
}: {
  viewportBounds?: { x: number; y: number; width: number; height: number };
  onNavigate?: (q: number, r: number) => void;
  onHexAction?: (hex: HexCoord) => void;
  timeRemaining?: number;
  roundState?: 'active' | 'intermission';
  cooldownActive?: boolean;
}) {
  const showLeaderboard = useUIStore((s) => s.showLeaderboard);
  const showActivityFeed = useUIStore((s) => s.showActivityFeed);
  const showMinimap = useUIStore((s) => s.showMinimap);
  const showOnlineUsers = useUIStore((s) => s.showOnlineUsers);
  const toggleLeaderboard = useUIStore((s) => s.toggleLeaderboard);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          toggleLeaderboard();
          break;
      }
    },
    [toggleLeaderboard]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* ═══ Top-Left: Player Stats + Energy + Scanner ═══ */}
      <div className="absolute top-4 left-4 pointer-events-auto flex flex-col gap-3">
        <TacticalPanel title="Operator Status" className="w-64">
          <PlayerStats />
        </TacticalPanel>
        <TacticalPanel className="w-64">
          <EnergyPanel />
        </TacticalPanel>
        <SectorIntel onAction={onHexAction} cooldownActive={cooldownActive} />
      </div>

      {/* ═══ Top-Center: Round Timer ═══ */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <TacticalPanel compact>
            <div className="text-center font-mono w-32">
              <div className="text-[9px] tracking-wider mb-0.5 text-[var(--text-secondary)] uppercase font-semibold">
                {roundState === 'active' ? 'ROUND TIME' : 'NEXT ROUND'}
              </div>
              <div className="text-lg font-bold tracking-widest text-[var(--accent-cyan)]">
                {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:
                {(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </TacticalPanel>
        </motion.div>
      </div>

      {/* ═══ Top-Right: Online Users ═══ */}
      <AnimatePresence>
        {showOnlineUsers && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 pointer-events-auto"
          >
            <OnlineUsers />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Bottom-Left: Activity Feed ═══ */}
      <AnimatePresence>
        {showActivityFeed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 pointer-events-auto"
          >
            <ActivityFeed />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Bottom-Right: Minimap ═══ */}
      <AnimatePresence>
        {showMinimap && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 pointer-events-auto"
          >
            <Minimap viewportBounds={viewportBounds} onNavigate={onNavigate} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Center: Leaderboard Overlay ═══ */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={(e) => {
              // Close on backdrop click
              if (e.target === e.currentTarget) toggleLeaderboard();
            }}
          >
            <Leaderboard onClose={toggleLeaderboard} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Bottom-Center: Keyboard Hints ═══ */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="font-mono text-[9px] tracking-widest uppercase text-center"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span className="inline-block px-1.5 py-0.5 mr-1 border rounded"
            style={{ borderColor: 'var(--border-subtle)' }}>
            TAB
          </span>
          Rankings
        </motion.div>
      </div>
    </div>
  );
}
