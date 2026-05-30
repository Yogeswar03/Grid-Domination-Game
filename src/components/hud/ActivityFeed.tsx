'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Activity Feed
// Scrolling tactical message log with immersive styling
// ═══════════════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import TacticalPanel from '@/components/ui/TacticalPanel';
import type { FeedMessage } from '@/types/game';

const TYPE_ICONS: Record<string, string> = {
  capture: '◆',
  attack: '⚔',
  system: '◈',
  warning: '⚠',
  join: '▶',
  leave: '◀',
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function FeedItem({ message }: { message: FeedMessage }) {
  const typeClass = `feed-item-${message.type}`;
  const icon = TYPE_ICONS[message.type] || '●';

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`feed-item ${typeClass}`}
    >
      <span className="mr-1.5 opacity-60">{icon}</span>
      <span>{message.text}</span>
      <span className="feed-timestamp">{formatTimestamp(message.timestamp)}</span>
    </motion.div>
  );
}

export default function ActivityFeed() {
  const activityFeed = useGameStore((s) => s.activityFeed);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest (top) on new messages — feed is newest-first
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activityFeed.length]);

  return (
    <TacticalPanel title="Comms Log" className="w-72">
      <div
        ref={scrollRef}
        className="max-h-52 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarGutter: 'stable' }}
      >
        {activityFeed.length === 0 ? (
          <div
            className="font-mono text-[10px] text-center py-4 tracking-wider uppercase"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ─── Awaiting transmissions ───
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {activityFeed.map((msg) => (
              <FeedItem key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </TacticalPanel>
  );
}
