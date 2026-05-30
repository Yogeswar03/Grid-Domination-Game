'use client';

// ═══════════════════════════════════════════════════════════════
// HEX PAINT WARS — Client Controller
// Modern flat design dashboard connecting to local websocket server
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { usePresenceStore } from '@/store/presenceStore';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useAudio } from '@/hooks/useAudio';
import JoinScreen from '@/components/lobby/JoinScreen';
import HUDLayout from '@/components/hud/HUDLayout';
import {
  captureMessage,
  joinMessage,
  leaveMessage,
  systemMessage,
} from '@/utils/tacticalMessages';
import { hexNeighbors, isInBounds, hexToPixel } from '@/utils/hexMath';
import { GAME_CONFIG, type TileData, type HexCoord } from '@/types/game';

// ── Bot Faction Constants (Offline Playground Mode) ───────────
const BOTS = [
  { id: 'bot_alpha', name: 'Vanguard Alpha', color: '#10b981', q: 15, r: 15 },
  { id: 'bot_nebula', name: 'Nebula Core', color: '#a855f7', q: 45, r: 15 },
  { id: 'bot_solaris', name: 'Solaris Unit', color: '#eab308', q: 15, r: 45 },
  { id: 'bot_aegis', name: 'Aegis Command', color: '#ef4444', q: 45, r: 45 },
];

const MAP_SIZE = 60; // Simplified cleaner map dimensions
const PLAYER_SPAWN_Q = 30;
const PLAYER_SPAWN_R = 30;

export default function Home() {
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const [roundState, setRoundState] = useState<'active' | 'intermission'>('active');
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [winner, setWinner] = useState<{ username: string; color: string; score: number } | null>(null);
  const [cooldownActive, setCooldownActive] = useState(false);

  // Zustand State & Actions
  const playerId = useGameStore((s) => s.playerId);
  const username = useGameStore((s) => s.username);
  const color = useGameStore((s) => s.color);
  const isJoined = useGameStore((s) => s.isJoined);
  const tiles = useGameStore((s) => s.tiles);
  const energy = useGameStore((s) => s.energy);
  const hoveredHex = useGameStore((s) => s.hoveredHex);

  const updateTile = useGameStore((s) => s.updateTile);
  const batchUpdateTiles = useGameStore((s) => s.batchUpdateTiles);
  const addFeedMessage = useGameStore((s) => s.addFeedMessage);
  const updateLeaderboard = useGameStore((s) => s.updateLeaderboard);
  const regenerateEnergy = useGameStore((s) => s.regenerateEnergy);
  const deductEnergy = useGameStore((s) => s.deductEnergy);
  const setSeasonInfo = useGameStore((s) => s.setSeasonInfo);
  const setSelectedHex = useGameStore((s) => s.setSelectedHex);

  // Sound Synth API
  const audio = useAudio();

  // WebSocket Server Ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track other player cursor positions
  const otherCursorsRef = useRef<Map<string, { q: number; r: number; color: string }>>(new Map());
  
  // Click cooldown timer
  const lastClickTimeRef = useRef(0);

  // ── Hex Painting click trigger ──────────────────────────────
  const handleHexClick = useCallback(
    async (hex: HexCoord) => {
      if (!isJoined || !playerId) return;
      if (roundState !== 'active') return; // Block clicks during intermission
      if (cooldownActive) return; // Block clicks if local cooldown is active

      const now = Date.now();
      if (now - lastClickTimeRef.current < 200) return; // Enforce 200ms clicking cooldown
      lastClickTimeRef.current = now;

      // Trigger visual cooldown state
      setCooldownActive(true);
      setTimeout(() => {
        setCooldownActive(false);
      }, 200);

      audio.click();

      const { q, r } = hex;
      if (!isInBounds(q, r, MAP_SIZE)) return;

      setSelectedHex(hex);

      // Capture Cost: 10 EP
      const cost = 10;
      if (energy < cost) {
        audio.warning();
        addFeedMessage(systemMessage('Energy reserve critical. Recharging...'));
        return;
      }

      // Deduct local energy
      deductEnergy(cost);
      audio.capturePulse();

      const tileData: TileData = {
        q,
        r,
        ownerId: playerId,
        ownerColor: color,
        influenceStrength: 1.0,
        state: 'owned',
        lastUpdated: Date.now()
      };

      // Broadcast paint event via WS
      if (websocketConnected && wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({
          type: 'paint',
          q,
          r,
          playerId,
          color
        }));
        updateTile(tileData);
      } else {
        // Offline sandbox mode
        updateTile(tileData);
        addFeedMessage(captureMessage(username, q, r, color));

        // Check offline instant dominance (50% of the 60x60 grid = 1800 tiles)
        let playerTiles = 0;
        useGameStore.getState().tiles.forEach((t) => {
          if (t.ownerId === playerId) playerTiles++;
        });

        if (playerTiles >= 1800) {
          setRoundState('intermission');
          setWinner({ username: username || 'You', color, score: playerTiles });
          setTimeRemaining(10);
          audio.warning();
        }
      }
    },
    [isJoined, playerId, energy, color, username, deductEnergy, updateTile, setSelectedHex, websocketConnected, audio, addFeedMessage, roundState, cooldownActive]
  );

  // ── Instantiate Canvas Game Engine ────────────────────────
  const { canvasRef, engine, isReady } = useGameEngine({
    onHexClick: handleHexClick,
    onHexHover: (hex) => useGameStore.getState().setHoveredHex(hex),
    mapSize: MAP_SIZE,
    initialCenter: { q: PLAYER_SPAWN_Q, r: PLAYER_SPAWN_R },
    initialZoom: 1.0,
  });

  // ── Establish Local WebSocket Connection ─────────────────────
  useEffect(() => {
    if (!isJoined || !playerId) return;

    const connectWebSocket = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001`;
      console.log(`[ws-client] Connecting to ws server at ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[ws-client] Connected to WS server');
        setWebsocketConnected(true);
        
        // Register player details
        ws.send(JSON.stringify({
          type: 'join',
          player: { id: playerId, username, color }
        }));
        
        addFeedMessage(systemMessage('Connected to live battle grid.'));
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);

          switch (packet.type) {
            case 'init': {
              batchUpdateTiles(packet.tiles);
              if (engine) {
                engine.updateTiles(packet.tiles);
              }
              usePresenceStore.getState().setOnlinePlayers(packet.players);
              if (packet.roundState) setRoundState(packet.roundState);
              if (packet.timeRemaining !== undefined) setTimeRemaining(packet.timeRemaining);
              if (packet.winner) setWinner(packet.winner);
              break;
            }
            
            case 'tick': {
              if (packet.roundState) setRoundState(packet.roundState);
              if (packet.timeRemaining !== undefined) setTimeRemaining(packet.timeRemaining);
              if (packet.winner) setWinner(packet.winner);
              break;
            }
            
            case 'round_end': {
              setRoundState('intermission');
              setWinner(packet.winner);
              if (packet.timeRemaining !== undefined) setTimeRemaining(packet.timeRemaining);
              audio.warning();
              break;
            }
            
            case 'round_start': {
              setRoundState('active');
              setTimeRemaining(packet.timeRemaining || 180);
              setWinner(null);
              useGameStore.setState({ tiles: new Map(), energy: 100 });
              if (engine) {
                engine.grid.clear();
                engine.forceRedraw();
              }
              audio.capturePulse();
              addFeedMessage(systemMessage('A new paint round has started!'));
              break;
            }
            
            case 'join': {
              usePresenceStore.getState().addPlayer(packet.player);
              addFeedMessage(joinMessage(packet.player.username, packet.player.color));
              break;
            }
            
            case 'paint': {
              const tileData: TileData = {
                q: packet.q,
                r: packet.r,
                ownerId: packet.ownerId,
                ownerColor: packet.ownerColor,
                influenceStrength: 1.0,
                state: 'owned',
                lastUpdated: Date.now()
              };
              updateTile(tileData);
              break;
            }
            
            case 'cursor': {
              const player = usePresenceStore.getState().onlinePlayers.find(p => p.id === packet.playerId);
              if (player) {
                otherCursorsRef.current.set(packet.playerId, {
                  q: packet.q,
                  r: packet.r,
                  color: player.color
                });
              }
              break;
            }
            
            case 'leave': {
              const player = usePresenceStore.getState().onlinePlayers.find(p => p.id === packet.playerId);
              if (player) {
                addFeedMessage(leaveMessage(player.username, player.color));
              }
              usePresenceStore.getState().removePlayer(packet.playerId);
              otherCursorsRef.current.delete(packet.playerId);
              break;
            }
          }
        } catch (err) {
          console.error('[ws-client] Parser error:', err);
        }
      };

      ws.onclose = () => {
        console.log('[ws-client] WebSocket connection closed');
        setWebsocketConnected(false);
        addFeedMessage(systemMessage('Lost connection. Reconnecting...'));
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error('[ws-client] WebSocket error:', err);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [isJoined, playerId, username, color, engine, batchUpdateTiles, updateTile, addFeedMessage]);

  // ── Broadcast Player Cursor Position (100ms throttle) ──────────
  const lastCursorSendRef = useRef(0);
  useEffect(() => {
    if (!isJoined || !playerId || !websocketConnected || !wsRef.current) return;
    if (wsRef.current.readyState !== 1) return;
    if (!hoveredHex) return;

    const now = Date.now();
    if (now - lastCursorSendRef.current < 100) return;
    lastCursorSendRef.current = now;

    wsRef.current.send(JSON.stringify({
      type: 'cursor',
      playerId,
      q: hoveredHex.q,
      r: hoveredHex.r
    }));
  }, [hoveredHex, isJoined, playerId, websocketConnected]);

  // ── Sync Store Tiles with Canvas Grid ──────────────────────
  useEffect(() => {
    if (!isReady || !engine) return;

    const previousTiles = new Map<string, string | null>();
    
    // Set initial tiles
    const initialTilesList = Array.from(tiles.values());
    engine.updateTiles(initialTilesList);
    initialTilesList.forEach(t => {
      previousTiles.set(`${t.q},${t.r}`, t.ownerId);
    });

    const unsubscribe = useGameStore.subscribe((state) => {
      const stateTiles = state.tiles;
      if (stateTiles.size === 0) {
        previousTiles.clear();
        return;
      }
      stateTiles.forEach((tile, key) => {
        const prevOwner = previousTiles.get(key);
        if (prevOwner !== tile.ownerId) {
          previousTiles.set(key, tile.ownerId);
          if (tile.ownerId) {
            engine.captureTile(tile.q, tile.r, tile.ownerId, tile.ownerColor || '#38bdf8');
          } else {
            engine.grid.removeTile(tile.q, tile.r);
            engine.forceRedraw();
          }
        } else {
          engine.updateTile(tile);
        }
      });
    });

    return unsubscribe;
  }, [isReady, engine]);

  // ── Render Other Connected Operatives Cursors ────────────────
  useEffect(() => {
    if (!isReady || !engine) return;

    const drawCursors = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      engine.renderer.viewport.applyTransform(ctx);

      otherCursorsRef.current.forEach((cursor) => {
        const { x, y } = hexToPixel(cursor.q, cursor.r);
        const zoom = engine.getZoom();

        // Draw dotted selector ring
        ctx.beginPath();
        ctx.arc(x, y, GAME_CONFIG.HEX_SIZE * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = cursor.color;
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([3, 3]);
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = cursor.color;
        ctx.setLineDash([]);
        ctx.fill();
      });

      ctx.restore();
    };

    engine.loop.addCallback('draw-other-cursors', drawCursors);
    return () => {
      engine?.loop.removeCallback('draw-other-cursors');
    };
  }, [isReady, engine]);

  // ── Sync Viewport Bounds for Minimap ───────────────────────
  useEffect(() => {
    if (!isReady || !engine) return;

    const syncViewport = () => {
      const vp = engine.getViewport();
      const hexW = 30;
      const hexH = 34.64;
      setViewportBounds({
        x: vp.x / hexW,
        y: vp.y / hexH,
        width: vp.width / hexW,
        height: vp.height / hexH,
      });
    };

    engine.loop.addCallback('minimap-bounds-sync', syncViewport);
    return () => {
      engine?.loop.removeCallback('minimap-bounds-sync');
    };
  }, [isReady, engine]);

  // ── Client-Side Rapid Energy Regeneration (10 EP/s) ──────────
  useEffect(() => {
    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - lastTime) / 1000;
      lastTime = now;

      if (isJoined) {
        // Fast Energy Regeneration for Paint Wars
        useGameStore.setState((state) => {
          const newEnergy = Math.min(
            state.maxEnergy,
            state.energy + 10 * deltaSeconds
          );
          return { energy: newEnergy };
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isJoined]);

  // ── Configure Season Information & Initialize state ──────────
  useEffect(() => {
    // Standard flat season countdown
    const started = Date.now();
    const ends = started + GAME_CONFIG.SEASON_DURATION;
    setSeasonInfo({
      id: 'PAINT-SEASON',
      startedAt: started,
      endsAt: ends,
      timeRemaining: GAME_CONFIG.SEASON_DURATION,
    });

    // Populate offline bot starting territories if not connected
    if (!websocketConnected) {
      const initialTilesList: TileData[] = [];
      BOTS.forEach((bot) => {
        initialTilesList.push({
          q: bot.q,
          r: bot.r,
          ownerId: bot.id,
          ownerColor: bot.color,
          influenceStrength: 1.0,
          state: 'owned',
          lastUpdated: Date.now(),
        });
      });
      batchUpdateTiles(initialTilesList);
    }
  }, [websocketConnected, batchUpdateTiles, setSeasonInfo]);

  // ── Offline Game Loop Clock Ticker ────────────────────────────
  useEffect(() => {
    if (websocketConnected || !isJoined) return;

    const clock = setInterval(() => {
      if (roundState === 'active') {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // End round locally
            setRoundState('intermission');
            
            // Determine winner locally from current grid
            const currentTiles = useGameStore.getState().tiles;
            const scoreCount: Record<string, number> = {};
            currentTiles.forEach((tile) => {
              if (tile.ownerId) {
                scoreCount[tile.ownerId] = (scoreCount[tile.ownerId] || 0) + 1;
              }
            });

            let winnerId: string | null = null;
            let maxTiles = 0;
            for (const [pId, count] of Object.entries(scoreCount)) {
              if (count > maxTiles) {
                maxTiles = count;
                winnerId = pId;
              }
            }

            let winnerObj = null;
            if (winnerId === playerId) {
              winnerObj = { username: username || 'You', color: color || '#38bdf8', score: maxTiles };
            } else if (winnerId) {
              const bot = BOTS.find((b) => b.id === winnerId);
              winnerObj = { username: bot ? bot.name : 'Unknown Bot', color: bot ? bot.color : 'var(--text-secondary)', score: maxTiles };
            } else {
              winnerObj = { username: 'No One', color: '#64748b', score: 0 };
            }

            setWinner(winnerObj);
            audio.warning();
            return 10; // 10s intermission
          }
          return prev - 1;
        });
      } else {
        // Intermission lobby ticker
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Restart round locally
            setRoundState('active');
            setWinner(null);
            useGameStore.setState({ tiles: new Map(), energy: 100 });
            if (engine) {
              engine.grid.clear();
              engine.forceRedraw();
            }
            audio.capturePulse();
            addFeedMessage(systemMessage('A new paint round has started! Go paint!'));
            
            // Re-populate offline bots starting tiles
            const initialTilesList: TileData[] = [];
            BOTS.forEach((bot) => {
              initialTilesList.push({
                q: bot.q,
                r: bot.r,
                ownerId: bot.id,
                ownerColor: bot.color,
                influenceStrength: 1.0,
                state: 'owned',
                lastUpdated: Date.now(),
              });
            });
            
            // Also spawn human player starting base if they are joined
            if (isJoined && playerId) {
              initialTilesList.push({
                q: PLAYER_SPAWN_Q,
                r: PLAYER_SPAWN_R,
                ownerId: playerId,
                ownerColor: color,
                influenceStrength: 1.0,
                state: 'owned',
                lastUpdated: Date.now(),
              });
              if (engine) {
                engine.centerOn(PLAYER_SPAWN_Q, PLAYER_SPAWN_R);
              }
            }

            batchUpdateTiles(initialTilesList);
            return 180; // Reset to 3 minutes
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(clock);
  }, [websocketConnected, roundState, playerId, username, color, engine, batchUpdateTiles, audio, addFeedMessage, isJoined]);

  // ── Local Tile Decay Clock Ticker (Offline mode) ──────────────
  useEffect(() => {
    if (websocketConnected || !isJoined) return;

    const decayTimer = setInterval(() => {
      if (roundState !== 'active') return;

      const now = Date.now();
      const currentTiles = useGameStore.getState().tiles;

      currentTiles.forEach((tile, key) => {
        if (tile.ownerId && now - tile.lastUpdated > 10000) { // 10s expiration
          const resetTile = {
            q: tile.q,
            r: tile.r,
            ownerId: null,
            ownerColor: null,
            state: 'neutral' as const,
            influenceStrength: 0,
            lastUpdated: now
          };
          updateTile(resetTile);
        }
      });
    }, 1000);

    return () => clearInterval(decayTimer);
  }, [websocketConnected, roundState, updateTile, isJoined]);
 
   // Spawn player base on deploy
   const lastJoinedRef = useRef(false);
   useEffect(() => {
     if (isJoined && !lastJoinedRef.current) {
       lastJoinedRef.current = true;
 
       if (engine) {
         engine.centerOn(PLAYER_SPAWN_Q, PLAYER_SPAWN_R);
       }
 
       if (!websocketConnected) {
         setTimeRemaining(180);
         const playerTilesList: TileData[] = [
           {
             q: PLAYER_SPAWN_Q,
             r: PLAYER_SPAWN_R,
             ownerId: playerId!,
             ownerColor: color,
             influenceStrength: 1.0,
             state: 'owned',
             lastUpdated: Date.now(),
           },
         ];
         batchUpdateTiles(playerTilesList);
         addFeedMessage(joinMessage(username, color));
         addFeedMessage(systemMessage(`Operative designation active. Base claimed at (${PLAYER_SPAWN_Q},${PLAYER_SPAWN_R}).`));
       }
     }
   }, [isJoined, playerId, username, color, engine, websocketConnected, batchUpdateTiles, addFeedMessage]);
 
   // ── Calculate Rankings & Online users list ────────────────────
   useEffect(() => {
     const playersList = [
       { id: playerId || 'player_human', username: username || 'Operator', color: color || '#38bdf8' },
       ...Array.from(usePresenceStore.getState().onlinePlayers)
     ];
 
     // Deduplicate
     const uniquePlayers = Array.from(new Map(playersList.map(p => [p.id, p])).values());
 
     const territoriesCount: Record<string, number> = {};
     tiles.forEach((tile) => {
       if (tile.ownerId) {
         territoriesCount[tile.ownerId] = (territoriesCount[tile.ownerId] || 0) + 1;
       }
     });
 
     const totalOwned = Object.values(territoriesCount).reduce((a, b) => a + b, 0);
 
     const scores = uniquePlayers.map((p) => {
       const territory = territoriesCount[p.id] || 0;
       return {
         id: p.id,
         username: p.username,
         color: p.color,
         territory,
         captures: territory,
         attackWins: 0,
         influenceScore: territory,
         dominationPct: totalOwned > 0 ? (territory / totalOwned) * 100 : 0,
       };
     });
 
     scores.sort((a, b) => b.territory - a.territory);
     updateLeaderboard(scores);
   }, [tiles, playerId, username, color, updateLeaderboard]);
 
   // ── Bot Faction Paint Wars Simulation (Offline Mode only) ─────
   useEffect(() => {
     if (websocketConnected || roundState !== 'active' || !isJoined) return;
 
     const botTimer = setInterval(() => {
       const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
       const currentTiles = useGameStore.getState().tiles;
 
       // Find bot territory
       const botTiles = Array.from(currentTiles.values()).filter((t) => t.ownerId === bot.id);
       let target: HexCoord;
 
       if (botTiles.length > 0 && Math.random() < 0.8) {
         // Expand near territory
         const baseTile = botTiles[Math.floor(Math.random() * botTiles.length)];
         const neighbors = hexNeighbors(baseTile.q, baseTile.r);
         const validNeighbors = neighbors.filter((n) => isInBounds(n.q, n.r, MAP_SIZE));
         
         if (validNeighbors.length > 0) {
           target = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
         } else {
           target = {
             q: Math.floor(Math.random() * MAP_SIZE),
             r: Math.floor(Math.random() * MAP_SIZE),
           };
         }
       } else {
         // Paint random tile
         target = {
           q: Math.floor(Math.random() * MAP_SIZE),
           r: Math.floor(Math.random() * MAP_SIZE),
         };
       }
 
       const newTile: TileData = {
         q: target.q,
         r: target.r,
         ownerId: bot.id,
         ownerColor: bot.color,
         influenceStrength: 1.0,
         state: 'owned',
         lastUpdated: Date.now(),
       };
 
       updateTile(newTile);
       addFeedMessage(captureMessage(bot.name, target.q, target.r, bot.color));

       // Check bot instant dominance victory (50% grid = 1800 tiles)
       let botOwned = 0;
       currentTiles.forEach((t) => {
         if (t.ownerId === bot.id) botOwned++;
       });

       if (botOwned >= 1800) {
         setRoundState('intermission');
         setWinner({ username: bot.name, color: bot.color, score: botOwned });
         setTimeRemaining(10);
         audio.warning();
       }
     }, 1500);
 
     return () => clearInterval(botTimer);
   }, [websocketConnected, roundState, updateTile, addFeedMessage, audio, isJoined]);
 
   return (
     <main className="relative w-full h-full select-none overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
       {/* Hex grid canvas map */}
       <canvas
         ref={canvasRef}
         className="block w-full h-full cursor-grab active:cursor-grabbing outline-none"
       />
 
       {/* Floating Modern Flat HUD */}
        {isJoined && (
          <HUDLayout
            viewportBounds={viewportBounds}
            onNavigate={(q, r) => engine?.centerOn(q, r)}
            onHexAction={handleHexClick}
            timeRemaining={timeRemaining}
            roundState={roundState}
            cooldownActive={cooldownActive}
          />
        )}
 
       {/* Operator deployment screen */}
       {!isJoined && <JoinScreen />}

       {/* Intermission victory overlay modal */}
       {roundState === 'intermission' && winner && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
           style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)' }}
         >
           <div 
             className="w-96 p-6 rounded-md text-center font-mono border flex flex-col gap-4 animate-fade-in"
             style={{ 
               background: '#1e293b', 
               borderColor: winner.color && winner.color !== 'var(--text-secondary)' && winner.color !== '#64748b' ? winner.color : '#334155',
               boxShadow: winner.color && winner.color !== 'var(--text-secondary)' && winner.color !== '#64748b' ? `0 0 15px ${winner.color}40` : 'none'
             }}
           >
             <div className="text-[10px] tracking-widest text-[var(--text-tertiary)] uppercase font-semibold">
               ◆ System Concluded ◆
             </div>
             <h1 className="text-xl font-bold tracking-wider text-[var(--text-primary)]">
               ROUND CONCLUDED
             </h1>
             <div className="border-y border-dashed border-[var(--border-subtle)] py-4 my-2 flex flex-col gap-2">
               <span className="text-xs text-[var(--text-secondary)]">VICTORIOUS OPERATOR</span>
               <span 
                 className="text-lg font-bold tracking-widest uppercase"
                 style={{ color: winner.color || 'var(--text-primary)' }}
               >
                 {winner.username}
               </span>
               <span className="text-[11px] text-[var(--text-tertiary)] mt-1">
                 GRID DOMINANCE: {winner.score} SECTORS
               </span>
             </div>
             <div className="text-xs text-[var(--text-secondary)]">
               PREPARING NEXT EXPANSION CYCLE
             </div>
             <div className="text-2xl font-bold text-[var(--accent-cyan)]">
               {timeRemaining}s
             </div>
           </div>
         </div>
       )}
     </main>
   );
 }
