'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Join Screen
// Tactical command deployment interface
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import TacticalButton from '@/components/ui/TacticalButton';

const PRESET_COLORS = [
  '#00ffcc',
  '#0088ff',
  '#ff6b35',
  '#00ff88',
  '#ff3333',
  '#aa44ff',
  '#ffcc00',
  '#ff0088',
];

const LOCAL_STORAGE_KEY = 'td-session';

interface SavedSession {
  playerId: string;
  username: string;
  color: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function JoinScreen() {
  const [username, setUsername] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const { setPlayer, setJoined } = useGameStore();

  // Auto-join if we have a saved session
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const session: SavedSession = JSON.parse(saved);
        if (session.playerId && session.username) {
          setPlayer(session.playerId, session.username, session.color);
          setJoined(true);
        }
      }
    } catch {
      // Corrupted session, ignore
    }
  }, [setPlayer, setJoined]);

  const handleDeploy = () => {
    const trimmed = username.trim();
    if (!trimmed) return;

    const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Persist session
    const session: SavedSession = {
      playerId,
      username: trimmed,
      color: selectedColor,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));

    setPlayer(playerId, trimmed, selectedColor);
    setJoined(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleDeploy();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      {/* Animated background grid */}
      <div className="grid-bg" />

      {/* Radial ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 600px 400px at center, ${selectedColor}08 0%, transparent 70%)`,
          transition: 'background 0.5s ease',
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="tactical-panel relative z-10 w-full max-w-md mx-4"
      >
        {/* Corner bracket decorations */}
        <div
          className="absolute top-[-1px] right-[-1px] w-[14px] h-[14px] pointer-events-none"
          style={{ borderTop: '1px solid var(--accent-cyan)', borderRight: '1px solid var(--accent-cyan)', opacity: 0.6 }}
        />
        <div
          className="absolute bottom-[-1px] left-[-1px] w-[14px] h-[14px] pointer-events-none"
          style={{ borderBottom: '1px solid var(--accent-cyan)', borderLeft: '1px solid var(--accent-cyan)', opacity: 0.6 }}
        />

        <div className="p-8">
          {/* ── Header ── */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1
              className="font-display text-2xl font-bold tracking-widest neon-text mb-2"
              style={{ lineHeight: 1.3 }}
            >
              TERRITORY
              <br />
              DOMINATION
            </h1>
            <div
              className="font-heading text-xs tracking-[0.3em] uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              Tactical Command Interface v2.1
            </div>
          </motion.div>

          {/* ── Divider ── */}
          <motion.div
            variants={itemVariants}
            className="mb-6"
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, var(--border-glow), transparent)',
            }}
          />

          {/* ── Callsign Input ── */}
          <motion.div variants={itemVariants} className="mb-6">
            <label
              className="font-heading text-xs tracking-[0.2em] uppercase block mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Operator Callsign
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter designation..."
              maxLength={20}
              autoFocus
              className="tactical-input w-full"
            />
          </motion.div>

          {/* ── Color Selection ── */}
          <motion.div variants={itemVariants} className="mb-8">
            <label
              className="font-heading text-xs tracking-[0.2em] uppercase block mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Signature Frequency
            </label>
            <div className="flex gap-3 justify-center flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
                  style={{
                    backgroundColor: color,
                    color: color,
                  }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>

            {/* Selected color preview */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: selectedColor,
                  boxShadow: `0 0 8px ${selectedColor}66`,
                }}
              />
              <span
                className="font-mono text-xs tracking-wider uppercase"
                style={{ color: selectedColor }}
              >
                {selectedColor}
              </span>
            </div>
          </motion.div>

          {/* ── Deploy Button ── */}
          <motion.div variants={itemVariants}>
            <TacticalButton
              variant="primary"
              size="lg"
              onClick={handleDeploy}
              disabled={!username.trim()}
              className="w-full"
            >
              <span className="mr-2">◆</span>
              DEPLOY
              <span className="ml-2">◆</span>
            </TacticalButton>
          </motion.div>

          {/* ── Footer ── */}
          <motion.div
            variants={itemVariants}
            className="text-center mt-6 font-mono text-[10px] tracking-widest uppercase"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Encrypted channel · Real-time grid warfare
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
