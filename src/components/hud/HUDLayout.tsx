'use client';

// ═══════════════════════════════════════════════════════════════
// HEX PAINT WARS — Simplified HUD Layout
// Modern flat top bar and right-side collapsible leaderboard drawer
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import RulesModal from '@/components/lobby/RulesModal';
import TacticalButton from '@/components/ui/TacticalButton';

export default function HUDLayout({
  timeRemaining = 180,
  roundState = 'active',
  cooldownActive = false,
}: {
  viewportBounds?: { x: number; y: number; width: number; height: number };
  onNavigate?: (q: number, r: number) => void;
  onHexAction?: (hex: any) => void;
  timeRemaining?: number;
  roundState?: 'active' | 'intermission';
  cooldownActive?: boolean;
}) {
  const showLeaderboard = useUIStore((s) => s.showLeaderboard);
  const toggleLeaderboard = useUIStore((s) => s.toggleLeaderboard);

  const [rulesOpen, setRulesOpen] = useState(false);

  // Retrieve player identity and energy info from game store
  const username = useGameStore((s) => s.username);
  const color = useGameStore((s) => s.color);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);

  const energyPct = Math.round((energy / maxEnergy) * 100);
  const isEnergyLow = energyPct <= 20;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col font-mono">
      {/* ── Top Bar ── */}
      <div 
        className="w-full h-14 px-6 flex items-center justify-between border-b pointer-events-auto shadow-md"
        style={{ 
          background: 'rgba(15, 23, 42, 0.95)', 
          backdropFilter: 'blur(8px)',
          borderColor: 'var(--border-subtle)' 
        }}
      >
        {/* Left: Player ID and Compact Energy Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}88`,
              }}
            />
            <span className="text-xs font-bold uppercase tracking-wider truncate max-w-32">
              {username || 'OPERATOR'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">EP:</span>
            {/* Flat Energy Bar */}
            <div className="w-24 h-2 bg-slate-800 border border-slate-700 rounded-sm overflow-hidden flex-shrink-0">
              <div 
                className="h-full transition-all duration-150"
                style={{ 
                  width: `${energyPct}%`,
                  background: isEnergyLow 
                    ? 'linear-gradient(90deg, #ef4444, #f59e0b)' 
                    : 'linear-gradient(90deg, #0d9488, #38bdf8)'
                }}
              />
            </div>
            <span className={`text-[11px] font-bold ${isEnergyLow ? 'text-red-400' : 'text-[var(--accent-cyan)]'}`}>
              {Math.floor(energy)}/{maxEnergy}
            </span>
          </div>

          {/* Cooldown Active / Visual Warn */}
          {cooldownActive && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm border border-red-500 bg-red-950/20 text-red-400 uppercase tracking-widest animate-pulse font-bold">
              SYS RECHARGING
            </span>
          )}
        </div>

        {/* Center: Authoritative Round Clock */}
        <div className="flex flex-col items-center justify-center font-bold text-center">
          <span className="text-[9px] tracking-widest text-[var(--text-secondary)] uppercase">
            {roundState === 'active' ? 'ROUND TIME' : 'NEXT ROUND'}
          </span>
          <span 
            className="text-base tracking-widest"
            style={{ color: roundState === 'active' ? 'var(--accent-cyan)' : 'var(--warning)' }}
          >
            {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:
            {(timeRemaining % 60).toString().padStart(2, '0')}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <TacticalButton
            variant="ghost"
            size="sm"
            onClick={() => setRulesOpen(true)}
            className="!px-3 !py-1 !text-xs font-mono"
          >
            ℹ HOW TO PLAY
          </TacticalButton>

          <TacticalButton
            variant={showLeaderboard ? 'primary' : 'ghost'}
            size="sm"
            onClick={toggleLeaderboard}
            className="!px-3 !py-1 !text-xs font-mono"
          >
            🏆 RANKINGS {showLeaderboard ? '▼' : '▲'}
          </TacticalButton>
        </div>
      </div>

      {/* ── Sidebar Leaderboard (Collapsible) ── */}
      <AnimatePresence>
        {showLeaderboard && (
          <Leaderboard onClose={toggleLeaderboard} />
        )}
      </AnimatePresence>

      {/* ── How to Play Modal ── */}
      <AnimatePresence>
        {rulesOpen && (
          <RulesModal onClose={() => setRulesOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
