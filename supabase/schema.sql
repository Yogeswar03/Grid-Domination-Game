-- ═══════════════════════════════════════════════════════════════
-- TERRITORY DOMINATION — Database Schema
-- Run this in your Supabase SQL Editor to set up all tables
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- Players
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00ffcc',
  influence_score INTEGER DEFAULT 0,
  energy FLOAT DEFAULT 100.0,
  max_energy FLOAT DEFAULT 100.0,
  last_energy_update TIMESTAMPTZ DEFAULT NOW(),
  total_captures INTEGER DEFAULT 0,
  attack_wins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- Tiles (lazy — only captured tiles exist in the DB)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,
  owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  influence_strength FLOAT DEFAULT 1.0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(q, r)
);

CREATE INDEX idx_tiles_qr ON tiles(q, r);
CREATE INDEX idx_tiles_owner ON tiles(owner_id);

-- ═══════════════════════════════════════════════════════════════
-- Seasons
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  winner_id UUID REFERENCES players(id)
);

-- ═══════════════════════════════════════════════════════════════
-- Capture / Attack log
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  tile_q INTEGER NOT NULL,
  tile_r INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('capture', 'attack', 'defend')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- Leaderboard snapshots
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  rank INTEGER,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Players: public read, insert, and update
CREATE POLICY "public_read_players" ON players FOR SELECT USING (true);
CREATE POLICY "public_insert_players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_players" ON players FOR UPDATE USING (true);

-- Tiles: public read, insert, and update
CREATE POLICY "public_read_tiles" ON tiles FOR SELECT USING (true);
CREATE POLICY "public_insert_tiles" ON tiles FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_tiles" ON tiles FOR UPDATE USING (true);

-- Seasons: public read only
CREATE POLICY "public_read_seasons" ON seasons FOR SELECT USING (true);

-- Captures: public read and insert
CREATE POLICY "public_read_captures" ON captures FOR SELECT USING (true);
CREATE POLICY "public_insert_captures" ON captures FOR INSERT WITH CHECK (true);

-- Leaderboard: public read only
CREATE POLICY "public_read_leaderboard" ON leaderboard_snapshots FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════
-- Enable Realtime for tiles and players
-- ═══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE tiles;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
