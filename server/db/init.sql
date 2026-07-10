-- Stray Cat Hunter — PostgreSQL core schema

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  email VARCHAR(255),
  password_hash TEXT,
  points INTEGER NOT NULL DEFAULT 100,
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ALTER COLUMN points SET DEFAULT 100;

CREATE TABLE IF NOT EXISTS cat_catches (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  accuracy_m REAL,
  fur_color VARCHAR(64),
  breed VARCHAR(64),
  condition_note VARCHAR(128),
  confidence SMALLINT,
  card_details JSONB,
  image_thumb TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cat_catches ADD COLUMN IF NOT EXISTS card_details JSONB;

CREATE TABLE IF NOT EXISTS seed_leaderboard (
  name VARCHAR(64) PRIMARY KEY,
  points INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_lower ON users (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_catches_user ON cat_catches (user_id);
CREATE INDEX IF NOT EXISTS idx_catches_created ON cat_catches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catches_lat_lng ON cat_catches (lat, lng) WHERE lat IS NOT NULL;

INSERT INTO seed_leaderboard (name, points) VALUES
  ('RinaKitty', 340),
  ('BangAndi', 290),
  ('MeongLover', 210),
  ('PakRT07', 150)
ON CONFLICT (name) DO NOTHING;
