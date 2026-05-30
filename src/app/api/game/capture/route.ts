// ═══════════════════════════════════════════════════════════════
// POST /api/game/capture — Capture a neutral tile
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { CaptureRequest, CaptureResponse, TileData, DbTile } from '@/types/game'
import { GAME_CONFIG } from '@/types/game'

// ── Hex neighbor offsets (axial coordinates) ──────────────────
const HEX_NEIGHBORS = [
  { q: 1, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: -1, r: 1 },
]

function getNeighborCoords(q: number, r: number) {
  return HEX_NEIGHBORS.map(d => ({ q: q + d.q, r: r + d.r }))
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CaptureRequest
    const { playerId, q, r } = body

    // ── Validate inputs ───────────────────────────────────────
    if (!playerId || typeof q !== 'number' || typeof r !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid request: playerId, q, r are required' } satisfies CaptureResponse,
        { status: 400 }
      )
    }

    // ── Try Supabase ──────────────────────────────────────────
    const supabase = createServiceClient()

    if (!supabase) {
      // Mock mode — simulate capture
      const mockTile: TileData = {
        q,
        r,
        ownerId: playerId,
        ownerColor: '#00ffcc',
        influenceStrength: 1.0,
        state: 'owned',
        lastUpdated: Date.now(),
      }
      return NextResponse.json({
        success: true,
        tile: mockTile,
        energy: 100 - GAME_CONFIG.CAPTURE_COST,
      } satisfies CaptureResponse)
    }

    // ── 1. Validate player exists & has enough energy ─────────
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (playerErr || !player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' } satisfies CaptureResponse,
        { status: 404 }
      )
    }

    if (player.energy < GAME_CONFIG.CAPTURE_COST) {
      return NextResponse.json(
        { success: false, error: `Not enough energy (need ${GAME_CONFIG.CAPTURE_COST}, have ${player.energy})` } satisfies CaptureResponse,
        { status: 400 }
      )
    }

    // ── 2. Check tile is neutral (not owned by anyone) ────────
    const { data: existingTile } = await supabase
      .from('tiles')
      .select('*')
      .eq('q', q)
      .eq('r', r)
      .single()

    if (existingTile && existingTile.owner_id) {
      return NextResponse.json(
        { success: false, error: 'Tile is already owned. Use attack instead.' } satisfies CaptureResponse,
        { status: 400 }
      )
    }

    // ── 3. Check adjacency (first tile is free, otherwise needs neighbor) ──
    const { data: playerTiles } = await supabase
      .from('tiles')
      .select('q, r')
      .eq('owner_id', playerId)

    const hasTerritory = playerTiles && playerTiles.length > 0

    if (hasTerritory) {
      const neighbors = getNeighborCoords(q, r)
      const isAdjacent = neighbors.some(n =>
        playerTiles.some((t: { q: number; r: number }) => t.q === n.q && t.r === n.r)
      )
      if (!isAdjacent) {
        return NextResponse.json(
          { success: false, error: 'Tile must be adjacent to your existing territory' } satisfies CaptureResponse,
          { status: 400 }
        )
      }
    }

    // ── 4. Calculate influence strength from neighbors ─────────
    const neighbors = getNeighborCoords(q, r)
    let adjacentOwned = 0

    if (playerTiles) {
      for (const n of neighbors) {
        if (playerTiles.some((t: { q: number; r: number }) => t.q === n.q && t.r === n.r)) {
          adjacentOwned++
        }
      }
    }

    const influenceStrength = Math.min(
      1.0 + adjacentOwned * GAME_CONFIG.INFLUENCE_PER_NEIGHBOR,
      GAME_CONFIG.MAX_INFLUENCE
    )

    // ── 5. Upsert the tile ────────────────────────────────────
    const { data: tile, error: tileErr } = await supabase
      .from('tiles')
      .upsert(
        {
          q,
          r,
          owner_id: playerId,
          influence_strength: influenceStrength,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'q,r' }
      )
      .select()
      .single()

    if (tileErr) {
      console.error('[capture] Tile upsert error:', tileErr)
      return NextResponse.json(
        { success: false, error: 'Failed to capture tile' } satisfies CaptureResponse,
        { status: 500 }
      )
    }

    // ── 6. Deduct energy & increment captures ─────────────────
    const newEnergy = player.energy - GAME_CONFIG.CAPTURE_COST

    const { error: updateErr } = await supabase
      .from('players')
      .update({
        energy: newEnergy,
        total_captures: (player.total_captures || 0) + 1,
        influence_score: (player.influence_score || 0) + 1,
      })
      .eq('id', playerId)

    if (updateErr) {
      console.error('[capture] Player update error:', updateErr)
    }

    // ── 7. Insert capture log ─────────────────────────────────
    await supabase.from('captures').insert({
      player_id: playerId,
      tile_q: q,
      tile_r: r,
      action_type: 'capture',
    })

    // ── 8. Build response ─────────────────────────────────────
    const tileData: TileData = {
      q: (tile as DbTile).q,
      r: (tile as DbTile).r,
      ownerId: (tile as DbTile).owner_id,
      ownerColor: player.color,
      influenceStrength: (tile as DbTile).influence_strength,
      state: 'owned',
      lastUpdated: new Date((tile as DbTile).updated_at).getTime(),
    }

    return NextResponse.json({
      success: true,
      tile: tileData,
      energy: newEnergy,
    } satisfies CaptureResponse)
  } catch (err) {
    console.error('[capture] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' } satisfies CaptureResponse,
      { status: 500 }
    )
  }
}
