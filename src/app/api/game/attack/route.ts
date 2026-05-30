// ═══════════════════════════════════════════════════════════════
// POST /api/game/attack — Attack an enemy-owned tile
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { AttackRequest, AttackResponse, TileData, DbTile } from '@/types/game'
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
    const body = (await request.json()) as AttackRequest
    const { playerId, q, r } = body

    // ── Validate inputs ───────────────────────────────────────
    if (!playerId || typeof q !== 'number' || typeof r !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid request: playerId, q, r are required' } satisfies AttackResponse,
        { status: 400 }
      )
    }

    // ── Try Supabase ──────────────────────────────────────────
    const supabase = createServiceClient()

    if (!supabase) {
      // Mock mode — simulate attack with 60% success
      const won = Math.random() < GAME_CONFIG.BASE_ATTACK_SUCCESS
      const mockTile: TileData = {
        q,
        r,
        ownerId: won ? playerId : 'defender-mock',
        ownerColor: won ? '#00ffcc' : '#ff4444',
        influenceStrength: won ? 1.0 : 2.0,
        state: 'owned',
        lastUpdated: Date.now(),
      }
      return NextResponse.json({
        success: true,
        won,
        tile: mockTile,
        energy: 100 - GAME_CONFIG.ATTACK_COST,
      } satisfies AttackResponse)
    }

    // ── 1. Validate player exists & has enough energy ─────────
    const { data: attacker, error: attackerErr } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (attackerErr || !attacker) {
      return NextResponse.json(
        { success: false, error: 'Player not found' } satisfies AttackResponse,
        { status: 404 }
      )
    }

    if (attacker.energy < GAME_CONFIG.ATTACK_COST) {
      return NextResponse.json(
        { success: false, error: `Not enough energy (need ${GAME_CONFIG.ATTACK_COST}, have ${attacker.energy})` } satisfies AttackResponse,
        { status: 400 }
      )
    }

    // ── 2. Validate target tile is owned by someone else ──────
    const { data: targetTile, error: tileErr } = await supabase
      .from('tiles')
      .select('*')
      .eq('q', q)
      .eq('r', r)
      .single()

    if (tileErr || !targetTile) {
      return NextResponse.json(
        { success: false, error: 'Target tile does not exist or is neutral. Use capture instead.' } satisfies AttackResponse,
        { status: 400 }
      )
    }

    if (!targetTile.owner_id) {
      return NextResponse.json(
        { success: false, error: 'Tile is neutral. Use capture instead.' } satisfies AttackResponse,
        { status: 400 }
      )
    }

    if (targetTile.owner_id === playerId) {
      return NextResponse.json(
        { success: false, error: 'Cannot attack your own tile' } satisfies AttackResponse,
        { status: 400 }
      )
    }

    // ── 3. Validate attacker has adjacent tile ────────────────
    const neighbors = getNeighborCoords(q, r)

    const { data: allNeighborTiles } = await supabase
      .from('tiles')
      .select('q, r, owner_id')
      .or(
        neighbors.map(n => `and(q.eq.${n.q},r.eq.${n.r})`).join(',')
      )

    const adjacentAttackerTiles = allNeighborTiles?.filter(
      (t: { owner_id: string | null }) => t.owner_id === playerId
    ) || []

    if (adjacentAttackerTiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You need at least one adjacent tile to attack' } satisfies AttackResponse,
        { status: 400 }
      )
    }

    // ── 4. Calculate attack success rate ──────────────────────
    const adjacentDefenderTiles = allNeighborTiles?.filter(
      (t: { owner_id: string | null }) => t.owner_id === targetTile.owner_id
    ) || []

    const attackerBonus = Math.min(adjacentAttackerTiles.length, 3) * GAME_CONFIG.ATTACK_ADJACENCY_BONUS
    const defenderPenalty = Math.min(adjacentDefenderTiles.length, 3) * GAME_CONFIG.ATTACK_DEFENDER_PENALTY
    const influencePenalty = (targetTile.influence_strength || 1) * GAME_CONFIG.INFLUENCE_DEFENSE_BONUS

    let successRate = GAME_CONFIG.BASE_ATTACK_SUCCESS + attackerBonus - defenderPenalty - influencePenalty
    successRate = Math.max(0.05, Math.min(0.95, successRate)) // Clamp between 5% and 95%

    // ── 5. Roll the dice ──────────────────────────────────────
    const roll = Math.random()
    const won = roll < successRate

    // ── 6. Deduct energy from attacker ────────────────────────
    const newEnergy = attacker.energy - GAME_CONFIG.ATTACK_COST

    const attackerUpdate: Record<string, number> = {
      energy: newEnergy,
    }

    if (won) {
      attackerUpdate.attack_wins = (attacker.attack_wins || 0) + 1
      attackerUpdate.influence_score = (attacker.influence_score || 0) + 1
    }

    await supabase
      .from('players')
      .update(attackerUpdate)
      .eq('id', playerId)

    // ── 7. Handle outcome ─────────────────────────────────────
    let tileData: TileData

    if (won) {
      // Transfer ownership
      const { data: updatedTile, error: updateTileErr } = await supabase
        .from('tiles')
        .update({
          owner_id: playerId,
          influence_strength: 1.0, // Reset influence on capture
          updated_at: new Date().toISOString(),
        })
        .eq('q', q)
        .eq('r', r)
        .select()
        .single()

      if (updateTileErr) {
        console.error('[attack] Tile transfer error:', updateTileErr)
        return NextResponse.json(
          { success: false, error: 'Failed to transfer tile' } satisfies AttackResponse,
          { status: 500 }
        )
      }

      // Decrement defender influence score
      await supabase
        .from('players')
        .update({
          influence_score: Math.max(0, ((await supabase.from('players').select('influence_score').eq('id', targetTile.owner_id).single()).data?.influence_score || 1) - 1),
        })
        .eq('id', targetTile.owner_id)

      tileData = {
        q: (updatedTile as DbTile).q,
        r: (updatedTile as DbTile).r,
        ownerId: (updatedTile as DbTile).owner_id,
        ownerColor: attacker.color,
        influenceStrength: (updatedTile as DbTile).influence_strength,
        state: 'owned',
        lastUpdated: new Date((updatedTile as DbTile).updated_at).getTime(),
      }

      // Log successful attack
      await supabase.from('captures').insert({
        player_id: playerId,
        tile_q: q,
        tile_r: r,
        action_type: 'attack',
      })
    } else {
      // Attack failed — tile stays with defender
      tileData = {
        q: targetTile.q,
        r: targetTile.r,
        ownerId: targetTile.owner_id,
        ownerColor: null, // Client should look up color
        influenceStrength: targetTile.influence_strength,
        state: 'owned',
        lastUpdated: new Date(targetTile.updated_at).getTime(),
      }

      // Log failed attack as defend
      await supabase.from('captures').insert({
        player_id: playerId,
        tile_q: q,
        tile_r: r,
        action_type: 'defend',
      })
    }

    return NextResponse.json({
      success: true,
      won,
      tile: tileData,
      energy: newEnergy,
    } satisfies AttackResponse)
  } catch (err) {
    console.error('[attack] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' } satisfies AttackResponse,
      { status: 500 }
    )
  }
}
