'use client';

// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Tactical Button
// Neon-glow combat-ready button with audio feedback
// ═══════════════════════════════════════════════════════════════

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { tacticalAudio } from '@/lib/audio/TacticalAudio';

interface TacticalButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

const variantClasses: Record<string, string> = {
  primary: 'tactical-btn tactical-btn-primary',
  danger: 'tactical-btn tactical-btn-danger',
  ghost: 'tactical-btn border-transparent hover:border-[var(--border-glow)]',
};

export default function TacticalButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}: TacticalButtonProps) {
  const handleClick = () => {
    if (disabled) return;
    tacticalAudio.click();
    onClick?.();
  };

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        relative font-heading tracking-wider uppercase
        inline-flex items-center justify-center gap-2
        ${disabled ? 'opacity-35 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
