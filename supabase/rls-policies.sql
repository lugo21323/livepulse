-- ============================================
-- Row Level Security (RLS) Policies
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================

-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SESSIONS
-- ============================================
-- Presenters can do everything with their own sessions
CREATE POLICY "Presenters can manage their sessions"
  ON sessions FOR ALL
  USING (auth.uid() = presenter_id)
  WITH CHECK (auth.uid() = presenter_id);

-- Anyone can read active sessions (needed for audience to join)
CREATE POLICY "Anyone can read active sessions"
  ON sessions FOR SELECT
  USING (is_active = true);

-- ============================================
-- MESSAGES
-- ============================================
-- Anyone can read messages for active sessions
CREATE POLICY "Anyone can read messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.is_active = true
    )
  );

-- Anyone can insert messages into active sessions
CREATE POLICY "Anyone can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.is_active = true
    )
  );

-- ============================================
-- REACTIONS
-- ============================================
-- Anyone can read reactions
CREATE POLICY "Anyone can read reactions"
  ON reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = reactions.session_id AND sessions.is_active = true
    )
  );

-- Anyone can insert/update reactions (handled via RPC, but need base policy)
CREATE POLICY "Anyone can insert reactions"
  ON reactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.is_active = true
    )
  );

CREATE POLICY "Anyone can update reactions"
  ON reactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = reactions.session_id AND sessions.is_active = true
    )
  );

-- ============================================
-- POLLS
-- ============================================
-- Presenters can manage polls for their sessions
CREATE POLICY "Presenters can manage polls"
  ON polls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = polls.session_id AND sessions.presenter_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.presenter_id = auth.uid()
    )
  );

-- Anyone can read active polls
CREATE POLICY "Anyone can read polls"
  ON polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = polls.session_id AND sessions.is_active = true
    )
  );

-- ============================================
-- POLL OPTIONS
-- ============================================
-- Presenters can manage poll options
CREATE POLICY "Presenters can manage poll options"
  ON poll_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM polls
      JOIN sessions ON sessions.id = polls.session_id
      WHERE polls.id = poll_options.poll_id AND sessions.presenter_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls
      JOIN sessions ON sessions.id = polls.session_id
      WHERE polls.id = poll_id AND sessions.presenter_id = auth.uid()
    )
  );

-- Anyone can read poll options
CREATE POLICY "Anyone can read poll options"
  ON poll_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls
      JOIN sessions ON sessions.id = polls.session_id
      WHERE polls.id = poll_options.poll_id AND sessions.is_active = true
    )
  );

-- ============================================
-- POLL VOTES
-- ============================================
-- Anyone can insert votes (duplicate prevention handled by unique constraint + RPC)
CREATE POLICY "Anyone can vote"
  ON poll_votes FOR INSERT
  WITH CHECK (true);

-- Anyone can read their own votes
CREATE POLICY "Anyone can read votes"
  ON poll_votes FOR SELECT
  USING (true);

-- ============================================
-- QUESTION UPVOTES
-- ============================================
-- Anyone can insert/delete upvotes (handled via RPC)
CREATE POLICY "Anyone can manage upvotes"
  ON question_upvotes FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- EMAIL CAPTURES
-- ============================================
-- Anyone can insert email captures
CREATE POLICY "Anyone can submit email"
  ON email_captures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.is_active = true
    )
  );

-- Only presenters can read email captures for their sessions
CREATE POLICY "Presenters can read email captures"
  ON email_captures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = email_captures.session_id AND sessions.presenter_id = auth.uid()
    )
  );

-- ============================================
-- RATINGS
-- ============================================
-- Anyone can submit a rating
CREATE POLICY "Anyone can submit rating"
  ON ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.is_active = true
    )
  );

-- Only presenters can read ratings for their sessions
CREATE POLICY "Presenters can read ratings"
  ON ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = ratings.session_id AND sessions.presenter_id = auth.uid()
    )
  );

-- ============================================
-- Enable Realtime on key tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE polls;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE question_upvotes;
