'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — useAudio Hook
// React wrapper for tactical sound synthesis
// ═══════════════════════════════════════════════════════════════

import { useEffect, useCallback, useRef } from 'react';
import { tacticalAudio } from '@/lib/audio/TacticalAudio';
import { useUIStore } from '@/store/uiStore';

export function useAudio() {
  const initialized = useRef(false);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const soundVolume = useUIStore((s) => s.soundVolume);

  // Sync volume & enabled state with UI store
  useEffect(() => {
    tacticalAudio.setEnabled(soundEnabled);
    tacticalAudio.setVolume(soundVolume);
  }, [soundEnabled, soundVolume]);

  // Initialize audio on first user interaction
  useEffect(() => {
    if (initialized.current) return;

    const handleInteraction = () => {
      if (!initialized.current) {
        tacticalAudio.init();
        initialized.current = true;
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const click = useCallback(() => tacticalAudio.click(), []);
  const blip = useCallback((freq?: number) => tacticalAudio.blip(freq), []);
  const capturePulse = useCallback(() => tacticalAudio.capturePulse(), []);
  const attackSound = useCallback(() => tacticalAudio.attackSound(), []);
  const warning = useCallback(() => tacticalAudio.warningPulse(), []);
  const recharge = useCallback(() => tacticalAudio.rechargeSound(), []);

  return { click, blip, capturePulse, attackSound, warning, recharge };
}
