'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Minimap
// Tactical overview canvas with radar sweep
// ═══════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { GAME_CONFIG } from '@/types/game';
import TacticalPanel from '@/components/ui/TacticalPanel';

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 180;
const MAP_SIZE = GAME_CONFIG.MAP_SIZE; // 120

interface MinimapProps {
  viewportBounds?: { x: number; y: number; width: number; height: number };
  onNavigate?: (q: number, r: number) => void;
}

export default function Minimap({ viewportBounds, onNavigate }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tiles = useGameStore((s) => s.tiles);
  const playerId = useGameStore((s) => s.playerId);

  const renderMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_WIDTH * dpr;
    canvas.height = MINIMAP_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#060a10';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw subtle grid origin crosshair
    ctx.strokeStyle = 'rgba(0,255,204,0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(MINIMAP_WIDTH / 2, 0);
    ctx.lineTo(MINIMAP_WIDTH / 2, MINIMAP_HEIGHT);
    ctx.moveTo(0, MINIMAP_HEIGHT / 2);
    ctx.lineTo(MINIMAP_WIDTH, MINIMAP_HEIGHT / 2);
    ctx.stroke();

    // Scale: map each hex coord to minimap pixel
    const scaleX = MINIMAP_WIDTH / MAP_SIZE;
    const scaleY = MINIMAP_HEIGHT / MAP_SIZE;
    const offsetX = MINIMAP_WIDTH / 2;
    const offsetY = MINIMAP_HEIGHT / 2;

    // Draw tiles
    tiles.forEach((tile) => {
      if (!tile.ownerId || !tile.ownerColor) return;

      // Convert hex coords to pixel position on minimap
      const px = offsetX + tile.q * scaleX;
      const py = offsetY + tile.r * scaleY;

      const isPlayer = tile.ownerId === playerId;
      const size = isPlayer ? 2 : 1.5;
      const alpha = isPlayer ? 1 : 0.7;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = tile.ownerColor;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    });

    ctx.globalAlpha = 1;

    // Draw viewport bounds
    if (viewportBounds) {
      const vx = offsetX + viewportBounds.x * scaleX;
      const vy = offsetY + viewportBounds.y * scaleY;
      const vw = viewportBounds.width * scaleX;
      const vh = viewportBounds.height * scaleY;

      ctx.strokeStyle = 'rgba(0,255,204,0.7)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(0,255,204,0.4)';
      ctx.shadowBlur = 4;
      ctx.strokeRect(vx, vy, vw, vh);
      ctx.shadowBlur = 0;
    }

    // Draw border frame
    ctx.strokeStyle = 'rgba(0,255,204,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, MINIMAP_WIDTH - 1, MINIMAP_HEIGHT - 1);
  }, [tiles, playerId, viewportBounds]);

  useEffect(() => {
    renderMinimap();
  }, [renderMinimap]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNavigate) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const scaleX = MINIMAP_WIDTH / MAP_SIZE;
    const scaleY = MINIMAP_HEIGHT / MAP_SIZE;
    const offsetX = MINIMAP_WIDTH / 2;
    const offsetY = MINIMAP_HEIGHT / 2;

    const q = Math.round((mx - offsetX) / scaleX);
    const r = Math.round((my - offsetY) / scaleY);

    onNavigate(q, r);
  };

  return (
    <TacticalPanel title="Tactical Map" compact>
      <div className="minimap-container relative">
        <canvas
          ref={canvasRef}
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          onClick={handleClick}
          className="cursor-crosshair block"
          style={{
            width: MINIMAP_WIDTH,
            height: MINIMAP_HEIGHT,
          }}
        />

        {/* Radar sweep overlay */}
        <div className="radar-sweep" />

        {/* Viewport indicator rectangle (CSS fallback for when no viewportBounds) */}
        {viewportBounds && (
          <div
            className="minimap-viewport-rect"
            style={{
              left: `${(viewportBounds.x / MAP_SIZE) * 100 + 50}%`,
              top: `${(viewportBounds.y / MAP_SIZE) * 100 + 50}%`,
              width: `${(viewportBounds.width / MAP_SIZE) * 100}%`,
              height: `${(viewportBounds.height / MAP_SIZE) * 100}%`,
            }}
          />
        )}

        {/* Scale label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-1 right-2 font-mono text-[8px] tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {MAP_SIZE}×{MAP_SIZE}
        </motion.div>
      </div>
    </TacticalPanel>
  );
}
