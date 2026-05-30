'use client';

// ═══════════════════════════════════════════════════════════════
// HEX PAINT WARS — Rules Modal
// Modern flat design popup for game guidelines and networking
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import TacticalButton from '@/components/ui/TacticalButton';

interface RulesModalProps {
  onClose: () => void;
}

export default function RulesModal({ onClose }: RulesModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
      style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg p-6 rounded-md font-mono border flex flex-col gap-4 text-[var(--text-primary)]"
        style={{
          background: '#1e293b',
          borderColor: '#334155',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-dashed border-[var(--border-subtle)] pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-widest text-[var(--text-tertiary)] uppercase font-semibold">
              ◆ System Protocol ◆
            </span>
            <h2 className="text-lg font-bold tracking-wider text-[var(--accent-cyan)]">
              HOW TO PLAY & RULES
            </h2>
          </div>
          <TacticalButton variant="ghost" size="sm" onClick={onClose} className="!px-2 !py-1">
            ✕
          </TacticalButton>
        </div>

        {/* Content Section */}
        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          {/* Objective */}
          <div>
            <span className="text-[10px] tracking-widest uppercase font-bold text-[var(--text-secondary)]">
              🎯 OBJECTIVE
            </span>
            <p className="mt-1 text-[var(--text-primary)]">
              Paint as many hex cells in your color as possible. Maintain dominance on the grid to secure the top rank!
            </p>
          </div>

          {/* Gameplay Rules */}
          <div>
            <span className="text-[10px] tracking-widest uppercase font-bold text-[var(--text-secondary)]">
              ⚡ CONTROLS & MECHANICS
            </span>
            <ul className="mt-1 flex flex-col gap-1.5 list-disc pl-4 text-[var(--text-secondary)]">
              <li>
                <strong className="text-[var(--text-primary)]">Direct Click Paint:</strong> Click or tap any hex cell on the grid to paint it immediately in your signature color.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Energy Cost:</strong> Painting a cell costs <span className="text-[var(--accent-cyan)]">10 EP</span>. Your energy regenerates at <span className="text-[var(--accent-cyan)]">10 EP/sec</span> up to a maximum of 100 EP.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">200ms Rate Limit:</strong> You can click up to 5 times per second. Clicks faster than 200ms will be ignored to prevent spam bots.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">10-Second Tile Decay:</strong> Painted tiles smoothly fade out and revert to neutral gray after 10 seconds of inactivity. Repaint your own tiles to refresh their lifespan!
              </li>
            </ul>
          </div>

          {/* How to Win */}
          <div>
            <span className="text-[10px] tracking-widest uppercase font-bold text-[var(--text-secondary)]">
              🏆 WIN CONDITIONS
            </span>
            <ul className="mt-1 flex flex-col gap-1.5 list-disc pl-4 text-[var(--text-secondary)]">
              <li>
                <strong className="text-[var(--text-primary)]">Round Timer:</strong> Each round lasts <span className="text-[var(--accent-cyan)]">3 minutes</span>. The operator with the highest tile count when the clock hits 00:00 wins.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Instant Dominance:</strong> If you paint <span className="text-[var(--accent-cyan)]">50% of the grid</span> (1,800 tiles) at any time, you win instantly.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Intermission:</strong> After a win, gameplay locks for <span className="text-[var(--accent-cyan)]">10 seconds</span> before clearing the board and starting the next round automatically.
              </li>
            </ul>
          </div>

          {/* How to Join */}
          <div>
            <span className="text-[10px] tracking-widest uppercase font-bold text-[var(--text-secondary)]">
              🌐 PLAYING WITH FRIENDS (MULTIPLAYER)
            </span>
            <div className="mt-1 p-2 bg-[#0f172a] rounded border border-[#334155] flex flex-col gap-2">
              <div>
                <strong className="text-[var(--text-primary)]">Option A: Same Network (Wi-Fi)</strong>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  1. The host starts the app and finds their local IP address (e.g. <code className="text-[var(--accent-cyan)]">192.168.1.50</code>).<br />
                  2. Other players open their browsers and enter <code className="text-[var(--accent-cyan)]">http://192.168.1.50:3000</code>.<br />
                  3. You will all automatically connect to the host's WebSocket server and paint together!
                </p>
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Option B: Multiple Local Tabs</strong>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Simply open <code className="text-[var(--accent-cyan)]">http://localhost:3000</code> in multiple browser tabs or windows to test the game locally.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer button */}
        <div className="mt-2 border-t border-[var(--border-subtle)] pt-3 flex justify-end">
          <TacticalButton variant="primary" size="sm" onClick={onClose} className="w-24">
            DISMISS
          </TacticalButton>
        </div>
      </motion.div>
    </div>
  );
}
