'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Sector Scan Intel
// Tactical panel for inspecting selected cells and executing actions
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { GAME_CONFIG, type HexCoord, type TileData } from '@/types/game';
import { hexNeighbors } from '@/utils/hexMath';
import TacticalPanel from '@/components/ui/TacticalPanel';
import TacticalButton from '@/components/ui/TacticalButton';

interface SectorIntelProps {
  onAction?: (hex: HexCoord) => void;
  cooldownActive?: boolean;
}

export default function SectorIntel({ onAction, cooldownActive = false }: SectorIntelProps) {
  const selectedHex = useGameStore((s) => s.selectedHex);
  const playerId = useGameStore((s) => s.playerId);
  const tiles = useGameStore((s) => s.tiles);
  const energy = useGameStore((s) => s.energy);
  const leaderboard = useGameStore((s) => s.leaderboard);

  // Retrieve tile data at selected coordinates
  const tileData = useMemo<TileData | null>(() => {
    if (!selectedHex) return null;
    return tiles.get(`${selectedHex.q},${selectedHex.r}`) || null;
  }, [selectedHex, tiles]);

  // Determine tactical status and action eligibility
  const tacticalStatus = useMemo(() => {
    if (!selectedHex || !playerId) return null;

    const { q, r } = selectedHex;
    const isNeutral = !tileData || !tileData.ownerId;
    const isOwn = tileData && tileData.ownerId === playerId;
    const isEnemy = tileData && tileData.ownerId && tileData.ownerId !== playerId;

    // Retrieve owner name
    let ownerName = 'UNCLAIMED';
    let ownerColor = 'var(--text-secondary)';
    if (isOwn) {
      ownerName = 'YOUR TERRITORY';
      ownerColor = 'var(--accent-cyan)';
    } else if (isEnemy) {
      const p = leaderboard.find((l) => l.id === tileData.ownerId);
      ownerName = p ? p.username : 'HOSTILE FORCE';
      ownerColor = tileData.ownerColor || 'var(--warning)';
    }

    // Paint Wars: Any tile can be painted for 10 EP. No adjacency check required.
    const actionCost = 10;
    const actionLabel = cooldownActive 
      ? 'RECHARGING...' 
      : (isEnemy ? 'PAINT OVER' : 'PAINT SECTOR');
    const buttonVariant: 'primary' | 'danger' | 'ghost' = isEnemy ? 'danger' : 'primary';
    
    let eligible = false;
    let errorMsg = '';

    if (!isOwn) {
      if (energy < actionCost) {
        eligible = false;
        errorMsg = 'LOW ENERGY: Insufficient power to paint';
      } else if (cooldownActive) {
        eligible = false;
        errorMsg = 'SYSTEM CHARGING: Cooldown active';
      } else {
        eligible = true;
      }
    }

    return {
      isNeutral,
      isOwn,
      isEnemy,
      ownerName,
      ownerColor,
      actionLabel,
      actionCost,
      buttonVariant,
      eligible,
      errorMsg,
    };
  }, [selectedHex, tileData, playerId, energy, leaderboard, cooldownActive]);

  if (!selectedHex) {
    return (
      <TacticalPanel title="Tactical Scanner" className="w-64">
        <div
          className="font-mono text-[10px] py-4 text-center tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}
        >
          [SCANNER STDBY]
          <br />
          Select any sector on the grid for tactical intel.
        </div>
      </TacticalPanel>
    );
  }

  const { q, r } = selectedHex;
  const status = tacticalStatus;

  return (
    <TacticalPanel title={`Sector Scanner [${q},${r}]`} className="w-64">
      {status ? (
        <div className="flex flex-col gap-2">
          {/* ── Intel Rows ── */}
          <div className="flex flex-col gap-1 text-[11px] font-mono">
            <div className="flex justify-between border-b border-dashed border-[var(--border-subtle)] pb-1">
              <span style={{ color: 'var(--text-secondary)' }}>GRID COORDS</span>
              <span className="text-[var(--text-primary)]">Q: {q} / R: {r}</span>
            </div>
            
            <div className="flex justify-between pb-1">
              <span style={{ color: 'var(--text-secondary)' }}>OPERATOR</span>
              <span style={{ color: status.ownerColor }} className="font-bold uppercase tracking-wider">
                {status.ownerName}
              </span>
            </div>
          </div>

          {/* ── Error Indicator ── */}
          {status.errorMsg && (
            <div className="text-[9px] font-mono text-[var(--warning)] border border-[var(--warning-dim)] bg-[var(--warning-dim)] p-1.5 rounded-sm uppercase tracking-wider leading-relaxed">
              ⚠ {status.errorMsg}
            </div>
          )}

          {/* ── Action Control ── */}
          {!status.isOwn ? (
            <div className="mt-1">
              <TacticalButton
                variant={status.buttonVariant}
                size="sm"
                className="w-full font-mono text-xs !py-2"
                disabled={!status.eligible}
                onClick={() => onAction?.(selectedHex)}
              >
                {status.actionLabel} ({status.actionCost} EP)
              </TacticalButton>
            </div>
          ) : (
            <div className="mt-1 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-center py-2 text-[10px] font-mono uppercase tracking-widest text-[var(--text-secondary)] rounded-sm">
              ◆ Base Secured ◆
            </div>
          )}
        </div>
      ) : (
        <div className="font-mono text-xs text-[var(--text-tertiary)] py-4 text-center">
          Loading Sector Intel...
        </div>
      )}
    </TacticalPanel>
  );
}
