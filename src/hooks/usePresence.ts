'use client'

// ═══════════════════════════════════════════════════════════════
// usePresence — Track online players & broadcast cursor positions
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { PresenceData, HexCoord } from '@/types/game'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceCallbacks {
  onPlayersChange?: (players: PresenceData[]) => void
  onCursorUpdate?: (playerId: string, cursor: HexCoord) => void
}

interface PresenceState {
  id: string
  username: string
  color: string
  online_at: string
}

/**
 * Presence hook for tracking online players and broadcasting cursor positions.
 * Gracefully no-ops if Supabase is not configured.
 */
export function usePresence(
  player: { id: string; username: string; color: string } | null,
  callbacks: PresenceCallbacks
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastBroadcastRef = useRef<number>(0)

  useEffect(() => {
    if (!isSupabaseConfigured() || !player) {
      console.log('[presence] Supabase not configured or no player — skipping presence')
      return
    }

    const supabase = createClient()
    if (!supabase) return

    const channel = supabase.channel('presence:game', {
      config: {
        presence: {
          key: player.id,
        },
      },
    })

    // ── Presence events ───────────────────────────────────────
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, any[]>
        const players: PresenceData[] = []

        for (const [, presences] of Object.entries(state)) {
          for (const p of presences) {
            players.push({
              id: p.id,
              username: p.username,
              color: p.color,
              lastSeen: Date.now(),
            })
          }
        }

        callbacks.onPlayersChange?.(players)
      })
      .on('presence', { event: 'join' }, ({ newPresences }: any) => {
        console.log('[presence] Player joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
        console.log('[presence] Player left:', leftPresences)
      })

    // ── Cursor broadcast listener ─────────────────────────────
    channel.on('broadcast', { event: 'cursor' }, ({ payload }: any) => {
      if (payload && payload.playerId && payload.cursor) {
        callbacks.onCursorUpdate?.(payload.playerId, payload.cursor)
      }
    })

    // ── Subscribe & track presence ────────────────────────────
    channel.subscribe(async (status: any) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: player.id,
          username: player.username,
          color: player.color,
          online_at: new Date().toISOString(),
        })
      }
    })

    channelRef.current = channel

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id])

  // ── Broadcast cursor position (throttled to 100ms) ──────────
  const broadcastCursor = useCallback(
    (cursor: HexCoord) => {
      if (!channelRef.current || !player) return

      const now = Date.now()
      if (now - lastBroadcastRef.current < 100) return
      lastBroadcastRef.current = now

      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          playerId: player.id,
          cursor,
        },
      })
    },
    [player]
  )

  return { broadcastCursor }
}

export default usePresence
