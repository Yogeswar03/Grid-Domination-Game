// ═══════════════════════════════════════════════════════════════
// POST /api/game/join — Register a new player
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { JoinRequest, JoinResponse, PlayerData } from '@/types/game'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JoinRequest
    const { username, color } = body

    // ── Validate inputs ───────────────────────────────────────
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    if (!color || typeof color !== 'string') {
      return NextResponse.json(
        { error: 'Color is required' },
        { status: 400 }
      )
    }

    // ── Try Supabase ──────────────────────────────────────────
    const supabase = createServiceClient()

    if (!supabase) {
      // Supabase not configured — return mock player
      const mockPlayer: PlayerData = {
        id: crypto.randomUUID(),
        username: username.trim(),
        color,
        influenceScore: 0,
        energy: 100,
        maxEnergy: 100,
        totalCaptures: 0,
        attackWins: 0,
        createdAt: Date.now(),
      }

      return NextResponse.json({ player: mockPlayer } satisfies JoinResponse)
    }

    // ── Insert player into Supabase ───────────────────────────
    const { data, error } = await supabase
      .from('players')
      .insert({
        username: username.trim(),
        color,
        influence_score: 0,
        energy: 100.0,
        max_energy: 100.0,
        total_captures: 0,
        attack_wins: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('[join] Supabase insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create player' },
        { status: 500 }
      )
    }

    const player: PlayerData = {
      id: data.id,
      username: data.username,
      color: data.color,
      influenceScore: data.influence_score,
      energy: data.energy,
      maxEnergy: data.max_energy,
      totalCaptures: data.total_captures,
      attackWins: data.attack_wins,
      createdAt: new Date(data.created_at).getTime(),
    }

    return NextResponse.json({ player } satisfies JoinResponse)
  } catch (err) {
    console.error('[join] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
