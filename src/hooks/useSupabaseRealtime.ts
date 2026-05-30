'use client'

// ═══════════════════════════════════════════════════════════════
// useSupabaseRealtime — Realtime subscriptions for tiles & players
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { TileData, DbTile, DbPlayer } from '@/types/game'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Callback types for realtime events.
 * The consumer (game store or component) provides these.
 */
interface RealtimeCallbacks {
  onTileUpdate?: (tile: TileData) => void
  onTileDelete?: (q: number, r: number) => void
  onPlayerUpdate?: (player: {
    id: string
    username: string
    color: string
    influenceScore: number
    energy: number
    totalCaptures: number
    attackWins: number
  }) => void
}

function dbTileToTileData(row: DbTile, ownerColor?: string | null): TileData {
  return {
    q: row.q,
    r: row.r,
    ownerId: row.owner_id,
    ownerColor: ownerColor ?? null,
    influenceStrength: row.influence_strength,
    state: row.owner_id ? 'owned' : 'neutral',
    lastUpdated: new Date(row.updated_at).getTime(),
  }
}

/**
 * Subscribe to realtime changes on tiles and players tables.
 * Gracefully no-ops if Supabase is not configured.
 */
export function useSupabaseRealtime(callbacks: RealtimeCallbacks) {
  const channelsRef = useRef<RealtimeChannel[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.log('[realtime] Supabase not configured — skipping realtime subscriptions')
      return
    }

    const supabase = createClient()
    if (!supabase) return

    // ── Tiles channel ─────────────────────────────────────────
    const tilesChannel = supabase
      .channel('realtime:tiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tiles' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<DbTile>
            if (old.q !== undefined && old.r !== undefined) {
              callbacks.onTileDelete?.(old.q, old.r)
            }
          } else {
            // INSERT or UPDATE
            const row = payload.new as DbTile
            const tile = dbTileToTileData(row)
            callbacks.onTileUpdate?.(tile)
          }
        }
      )
      .subscribe((status: any) => {
        console.log('[realtime] Tiles channel status:', status)
      })

    // ── Players channel ───────────────────────────────────────
    const playersChannel = supabase
      .channel('realtime:players')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as DbPlayer
            callbacks.onPlayerUpdate?.({
              id: row.id,
              username: row.username,
              color: row.color,
              influenceScore: row.influence_score,
              energy: row.energy,
              totalCaptures: row.total_captures,
              attackWins: row.attack_wins,
            })
          }
        }
      )
      .subscribe((status: any) => {
        console.log('[realtime] Players channel status:', status)
      })

    channelsRef.current = [tilesChannel, playersChannel]

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      channelsRef.current.forEach(ch => {
        supabase.removeChannel(ch)
      })
      channelsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default useSupabaseRealtime
