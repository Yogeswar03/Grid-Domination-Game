'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Online Users
// Presence indicator with expandable player roster
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresenceStore } from '@/store/presenceStore';
import TacticalPanel from '@/components/ui/TacticalPanel';
import { tacticalAudio } from '@/lib/audio/TacticalAudio';

export default function OnlineUsers() {
  const [expanded, setExpanded] = useState(false);
  const onlinePlayers = usePresenceStore((s) => s.onlinePlayers);

  const count = onlinePlayers.length;

  const handleToggle = () => {
    tacticalAudio.blip(expanded ? 660 : 880);
    setExpanded((prev) => !prev);
  };

  return (
    <div className="relative">
      {/* ── Compact Badge ── */}
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="tactical-panel flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        style={{ minWidth: 100 }}
      >
        {/* Pulsing green dot */}
        <span className="online-dot" />

        <span
          className="font-heading text-xs tracking-[0.15em] uppercase font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {count} <span style={{ color: 'var(--text-secondary)' }}>ONLINE</span>
        </span>

        {/* Expand/collapse indicator */}
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs opacity-40 ml-auto"
        >
          ▾
        </motion.span>
      </motion.button>

      {/* ── Expanded Player List ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 4, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.9 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full right-0 mt-1 z-50"
            style={{ transformOrigin: 'top right' }}
          >
            <TacticalPanel title="Active Operators" className="w-56">
              {onlinePlayers.length === 0 ? (
                <div
                  className="font-mono text-[10px] text-center py-3 tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  No operators detected
                </div>
              ) : (
                <div className="space-y-1">
                  {onlinePlayers.map((player, i) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-2 py-1 px-1"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: player.color,
                          boxShadow: `0 0 4px ${player.color}88`,
                        }}
                      />
                      <span
                        className="font-mono text-xs truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {player.username}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </TacticalPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
