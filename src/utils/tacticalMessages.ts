// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Tactical Message Generator
// ═══════════════════════════════════════════════════════════════

import type { FeedMessage, FeedMessageType } from '@/types/game';

// ── Message Templates ─────────────────────────────────────────

const CAPTURE_MESSAGES = [
  '{player} claimed sector ({q},{r})',
  '{player} secured territory at ({q},{r})',
  '{player} expanded into ({q},{r})',
  'Sector ({q},{r}) falls under {player}\'s control',
  '{player} planted their flag at ({q},{r})',
  'Territory ({q},{r}) now belongs to {player}',
  '{player} annexed sector ({q},{r})',
  '{player} conquered grid ({q},{r})',
];

const ATTACK_WIN_MESSAGES = [
  '{player} seized ({q},{r}) from {defender}!',
  '{player} overran {defender}\'s position at ({q},{r})!',
  'Hostile takeover: {player} captured ({q},{r}) from {defender}',
  '{player} broke through {defender}\'s defenses at ({q},{r})',
  '{defender} lost sector ({q},{r}) to {player}\'s assault',
  '{player} stormed {defender}\'s territory at ({q},{r})',
];

const ATTACK_FAIL_MESSAGES = [
  '{player}\'s attack on ({q},{r}) was repelled by {defender}',
  '{defender} held the line at ({q},{r}) against {player}',
  'Defense holds: {player} failed to take ({q},{r})',
  '{player}\'s assault on {defender}\'s ({q},{r}) crumbled',
  '{defender} repelled {player} at sector ({q},{r})',
];

const JOIN_MESSAGES = [
  '{player} has entered the battlefield',
  '{player} deployed to the grid',
  'New operative: {player} online',
  '{player} joined the domination',
  'Incoming: {player} has arrived',
];

const LEAVE_MESSAGES = [
  '{player} left the battlefield',
  '{player} went offline',
  '{player} disconnected from the grid',
];

const SYSTEM_MESSAGES = [
  'Grid scan complete — all sectors mapped',
  'Territory boundaries recalculated',
  'New season begins — all territories reset',
  'Influence decay cycle triggered',
];

const WARNING_MESSAGES = [
  '⚠ Your territory at ({q},{r}) is under pressure',
  '⚠ Enemy forces detected near ({q},{r})',
  '⚠ Multiple hostiles converging on your territory',
  '⚠ Border sector ({q},{r}) losing influence',
];

// ── Icons ─────────────────────────────────────────────────────

const ICONS: Record<FeedMessageType, string[]> = {
  capture: ['🏴', '⚑', '📍', '🎯'],
  attack: ['⚔️', '💥', '🗡️', '🔥'],
  system: ['📡', '🛰️', '⚙️', '🔄'],
  warning: ['⚠️', '🚨', '❗', '🔔'],
  join: ['🟢', '📶', '🆕', '👤'],
  leave: ['🔴', '📴', '👋', '💤'],
};

// ── Helpers ───────────────────────────────────────────────────

let messageIdCounter = 0;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

function makeMessage(
  type: FeedMessageType,
  text: string,
  playerColor?: string,
): FeedMessage {
  return {
    id: `msg_${++messageIdCounter}_${Date.now()}`,
    text,
    icon: pick(ICONS[type]),
    timestamp: Date.now(),
    type,
    playerColor,
  };
}

// ── Public API ────────────────────────────────────────────────

export function captureMessage(
  playerName: string,
  q: number,
  r: number,
  playerColor: string,
): FeedMessage {
  const text = fillTemplate(pick(CAPTURE_MESSAGES), {
    player: playerName,
    q,
    r,
  });
  return makeMessage('capture', text, playerColor);
}

export function attackWinMessage(
  attackerName: string,
  defenderName: string,
  q: number,
  r: number,
  attackerColor: string,
): FeedMessage {
  const text = fillTemplate(pick(ATTACK_WIN_MESSAGES), {
    player: attackerName,
    defender: defenderName,
    q,
    r,
  });
  return makeMessage('attack', text, attackerColor);
}

export function attackFailMessage(
  attackerName: string,
  defenderName: string,
  q: number,
  r: number,
  defenderColor: string,
): FeedMessage {
  const text = fillTemplate(pick(ATTACK_FAIL_MESSAGES), {
    player: attackerName,
    defender: defenderName,
    q,
    r,
  });
  return makeMessage('attack', text, defenderColor);
}

export function joinMessage(
  playerName: string,
  playerColor: string,
): FeedMessage {
  const text = fillTemplate(pick(JOIN_MESSAGES), { player: playerName });
  return makeMessage('join', text, playerColor);
}

export function leaveMessage(
  playerName: string,
  playerColor: string,
): FeedMessage {
  const text = fillTemplate(pick(LEAVE_MESSAGES), { player: playerName });
  return makeMessage('leave', text, playerColor);
}

export function systemMessage(custom?: string): FeedMessage {
  const text = custom ?? pick(SYSTEM_MESSAGES);
  return makeMessage('system', text);
}

export function warningMessage(
  q?: number,
  r?: number,
): FeedMessage {
  const template = pick(WARNING_MESSAGES);
  const text =
    q !== undefined && r !== undefined
      ? fillTemplate(template, { q, r })
      : template.replace(/\s*\(.*?\)/g, '');
  return makeMessage('warning', text);
}
