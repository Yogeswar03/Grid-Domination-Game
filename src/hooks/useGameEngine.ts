// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — useGameEngine React Hook
// ═══════════════════════════════════════════════════════════════
// Manages the GameEngine lifecycle within a React component.
// Handles canvas ref binding, init/destroy, and exposes the
// engine instance for external control.

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { GameEngine, type GameEngineOptions, type EngineStats } from '@/game/engine/GameEngine';
import type { HexCoord, TileData } from '@/types/game';

// ── Hook Options ──────────────────────────────────────────────

export interface UseGameEngineOptions {
  /** Called when the user clicks a hex. */
  onHexClick?: (hex: HexCoord) => void;

  /** Called when the hovered hex changes. */
  onHexHover?: (hex: HexCoord | null) => void;

  /** Called when the user right-clicks a hex. */
  onHexRightClick?: (hex: HexCoord) => void;

  /** Called on zoom change. */
  onZoomChange?: (zoom: number) => void;

  /** Map size override. */
  mapSize?: number;

  /** Initial center hex. */
  initialCenter?: HexCoord;

  /** Initial zoom level. */
  initialZoom?: number;

  /** Whether to auto-start the engine (default: true). */
  autoStart?: boolean;
}

// ── Hook Return ───────────────────────────────────────────────

export interface UseGameEngineReturn {
  /** Ref to attach to a <canvas> element. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  /** The engine instance (null until canvas is mounted). */
  engine: GameEngine | null;

  /** Whether the engine is initialized. */
  isReady: boolean;

  /** Convenience: capture a tile with effect. */
  captureTile: (q: number, r: number, playerId: string, playerColor: string) => void;

  /** Convenience: bulk update tiles. */
  updateTiles: (tiles: TileData[]) => void;

  /** Convenience: center camera on a hex. */
  centerOn: (q: number, r: number) => void;

  /** Convenience: get current stats. */
  getStats: () => EngineStats | null;
}

// ── Hook Implementation ───────────────────────────────────────

export function useGameEngine(options: UseGameEngineOptions = {}): UseGameEngineReturn {
  const {
    onHexClick,
    onHexHover,
    onHexRightClick,
    onZoomChange,
    mapSize,
    initialCenter,
    initialZoom,
    autoStart = true,
  } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Stable callback refs to avoid re-creating the engine on callback changes
  const callbackRefs = useRef({
    onHexClick,
    onHexHover,
    onHexRightClick,
    onZoomChange,
  });

  // Update callback refs on every render
  callbackRefs.current = {
    onHexClick,
    onHexHover,
    onHexRightClick,
    onZoomChange,
  };

  // ── Initialize Engine ─────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create engine with stable callbacks that delegate to refs
    const engine = new GameEngine({
      canvas,
      mapSize,
      onHexClick: (hex) => callbackRefs.current.onHexClick?.(hex),
      onHexHover: (hex) => callbackRefs.current.onHexHover?.(hex),
      onHexRightClick: (hex) => callbackRefs.current.onHexRightClick?.(hex),
      onZoomChange: (zoom) => callbackRefs.current.onZoomChange?.(zoom),
    });

    engineRef.current = engine;

    if (autoStart) {
      engine.init();

      // Apply initial view settings
      if (initialCenter) {
        engine.centerOn(initialCenter.q, initialCenter.r);
      } else {
        engine.centerOnMap();
      }

      if (initialZoom !== undefined) {
        engine.setZoom(initialZoom);
      }
    }

    setIsReady(true);

    // Cleanup
    return () => {
      engine.destroy();
      engineRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSize, autoStart]); // Only re-create if map size or autoStart changes

  // ── Convenience Methods ───────────────────────────────────

  const captureTile = useCallback(
    (q: number, r: number, playerId: string, playerColor: string) => {
      engineRef.current?.captureTile(q, r, playerId, playerColor);
    },
    [],
  );

  const updateTiles = useCallback((tiles: TileData[]) => {
    engineRef.current?.updateTiles(tiles);
  }, []);

  const centerOn = useCallback((q: number, r: number) => {
    engineRef.current?.centerOn(q, r);
  }, []);

  const getStats = useCallback((): EngineStats | null => {
    return engineRef.current?.getStats() ?? null;
  }, []);

  return {
    canvasRef,
    engine: engineRef.current,
    isReady,
    captureTile,
    updateTiles,
    centerOn,
    getStats,
  };
}
