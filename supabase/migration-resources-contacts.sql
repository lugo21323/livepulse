-- ============================================
-- Migration: Named Resources + Structured Contact Info
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Resources table (multiple named resources per session)
CREATE TABLE IF NOT EXISTS resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_session ON resources(session_id);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view resources"
  ON resources FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert resources"
  ON resources FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE presenter_id = auth.uid())
  );

CREATE POLICY "Authenticated users can update resources"
  ON resources FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE presenter_id = auth.uid())
  );

CREATE POLICY "Authenticated users can delete resources"
  ON resources FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE presenter_id = auth.uid())
  );

-- Add resources to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE resources;

-- 2. Structured contact fields on sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS headshot_url text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS contact_website text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS contact_linkedin text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS contact_twitter text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS contact_instagram text;
