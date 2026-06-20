-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  contact_number TEXT,
  ministry_group TEXT,
  notes TEXT,
  attendance_date DATE NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(normalized_name, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_normalized ON attendance(normalized_name);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_title TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  original_key TEXT NOT NULL,
  current_key TEXT,
  artist TEXT,
  tags TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(normalized_title);

-- Song sections table
CREATE TABLE IF NOT EXISTS song_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  content TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sections_song_id ON song_sections(song_id);
