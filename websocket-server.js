const { WebSocketServer } = require('ws');

// ═══════════════════════════════════════════════════════════════
// HEX PAINT WARS — WebSocket Server
// Run on port 3001 to synchronize paint events and player cursors.
// ═══════════════════════════════════════════════════════════════

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

// In-memory game state
const tiles = new Map(); // key "q,r" -> { q, r, ownerId, ownerColor, state, lastUpdated }
const players = new Map(); // key playerId -> { id, username, color, lastSeen }
const clients = new Map(); // ws connection -> playerId
const lastPaintTimes = new Map(); // key playerId -> timestamp of last paint operation

// Round management state
let roundState = 'active'; // 'active' | 'intermission'
let roundTimer = 180;      // 3 minutes in seconds
let lobbyTimer = 10;       // 10s intermission
let currentWinner = null;

console.log(`[ws-server] Starting Hex Paint Wars WS Server on port ${PORT}...`);

// Authoritative server-side game clock
setInterval(() => {
  if (roundState === 'active') {
    roundTimer--;

    // Periodically decay tiles after 10 seconds of inactivity
    const now = Date.now();
    tiles.forEach((tile, key) => {
      if (tile.ownerId && now - tile.lastUpdated > 10000) {
        tiles.delete(key);
        broadcast({
          type: 'paint',
          q: tile.q,
          r: tile.r,
          ownerId: null,
          ownerColor: null
        });
      }
    });

    if (roundTimer <= 0) {
      endRound();
    } else {
      broadcastTick();
    }
  } else if (roundState === 'intermission') {
    lobbyTimer--;
    if (lobbyTimer <= 0) {
      startRound();
    } else {
      broadcastTick();
    }
  }
}, 1000);

function endRound() {
  roundState = 'intermission';
  lobbyTimer = 10;

  // Calculate final score tiles per player
  const scoreCount = {};
  tiles.forEach((tile) => {
    if (tile.ownerId) {
      scoreCount[tile.ownerId] = (scoreCount[tile.ownerId] || 0) + 1;
    }
  });

  // Find player with the most tiles
  let winnerId = null;
  let maxTiles = 0;
  for (const [pId, count] of Object.entries(scoreCount)) {
    if (count > maxTiles) {
      maxTiles = count;
      winnerId = pId;
    }
  }

  const winnerPlayer = winnerId ? players.get(winnerId) : null;
  currentWinner = winnerPlayer ? {
    id: winnerPlayer.id,
    username: winnerPlayer.username,
    color: winnerPlayer.color,
    score: maxTiles
  } : {
    id: 'nobody',
    username: 'No One',
    color: '#64748b',
    score: 0
  };

  console.log(`[ws-server] Round ended! Winner: ${currentWinner.username} (${currentWinner.score} tiles)`);

  broadcast({
    type: 'round_end',
    winner: currentWinner,
    timeRemaining: lobbyTimer
  });
}

function startRound() {
  roundState = 'active';
  roundTimer = 180;
  currentWinner = null;
  tiles.clear();
  lastPaintTimes.clear();

  console.log(`[ws-server] Next round starting! Grid cleared.`);

  broadcast({
    type: 'round_start',
    timeRemaining: roundTimer
  });
}

function broadcastTick() {
  broadcast({
    type: 'tick',
    roundState,
    timeRemaining: roundState === 'active' ? roundTimer : lobbyTimer,
    winner: currentWinner
  });
}

wss.on('connection', (ws) => {
  console.log('[ws-server] New connection established');

  ws.on('message', (message) => {
    try {
      const packet = JSON.parse(message);
      
      switch (packet.type) {
        case 'join': {
          const { id, username, color } = packet.player;
          console.log(`[ws-server] Player "${username}" joined with color ${color}`);
          
          // Save player info
          players.set(id, { id, username, color, lastSeen: Date.now() });
          clients.set(ws, id);
          
          // Send initial state to the joining client (including current timer and round state)
          ws.send(JSON.stringify({
            type: 'init',
            tiles: Array.from(tiles.values()),
            players: Array.from(players.values()),
            roundState,
            timeRemaining: roundState === 'active' ? roundTimer : lobbyTimer,
            winner: currentWinner
          }));
          
          // Broadcast join event to all other clients
          broadcast({
            type: 'join',
            player: { id, username, color }
          }, ws);
          break;
        }
        
        case 'paint': {
          // Block painting during intermission lobby
          if (roundState !== 'active') return;

          const { q, r, playerId, color } = packet;

          // Enforce 200ms paint cooldown per player to ensure fair gameplay
          const now = Date.now();
          const lastPaint = lastPaintTimes.get(playerId) || 0;
          if (now - lastPaint < 200) {
            return; // Drop packet silently
          }
          lastPaintTimes.set(playerId, now);

          const key = `${q},${r}`;
          
          const tileData = {
            q,
            r,
            ownerId: playerId,
            ownerColor: color,
            state: 'owned',
            lastUpdated: Date.now()
          };
          
          tiles.set(key, tileData);
          
          // Broadcast paint event to all connected clients
          broadcast({
            type: 'paint',
            q,
            r,
            ownerId: playerId,
            ownerColor: color
          });

          // Check instant victory dominance (e.g. 50% of the 60x60 grid = 1800 tiles)
          let ownedTiles = 0;
          tiles.forEach((t) => {
            if (t.ownerId === playerId) {
              ownedTiles++;
            }
          });

          if (ownedTiles >= 1800) {
            console.log(`[ws-server] Instant victory reached! Player "${playerId}" dominated 50% of the grid.`);
            endRound();
          }
          break;
        }
        
        case 'cursor': {
          const { q, r, playerId } = packet;
          
          // Broadcast cursor position to other players
          broadcast({
            type: 'cursor',
            playerId,
            q,
            r
          }, ws);
          break;
        }
        
        default:
          console.warn(`[ws-server] Unknown packet type received: ${packet.type}`);
      }
    } catch (err) {
      console.error('[ws-server] Failed to process message:', err);
    }
  });

  ws.on('close', () => {
    const playerId = clients.get(ws);
    if (playerId) {
      const player = players.get(playerId);
      const username = player ? player.username : 'Unknown';
      console.log(`[ws-server] Connection closed for player "${username}" (${playerId})`);
      
      players.delete(playerId);
      clients.delete(ws);
      
      // Broadcast leave notification
      broadcast({
        type: 'leave',
        playerId
      });
    }
  });

  ws.on('error', (error) => {
    console.error('[ws-server] WebSocket error:', error);
  });
});

/**
 * Broadcast message to all connected clients.
 * @param {object} packet - JSON-serializable packet data
 * @param {object} excludeWs - Optional WebSocket connection to exclude from broadcast
 */
function broadcast(packet, excludeWs = null) {
  const data = JSON.stringify(packet);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client !== excludeWs) {
      client.send(data);
    }
  });
}

console.log(`[ws-server] Server running on ws://localhost:${PORT}`);
