-- ============================================
-- LivePulse Database Schema
-- Run this in Supabase SQL Editor (one time)
-- ============================================

-- 1. Sessions (one per talk/event)
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presenter_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  speaker_name text NOT NULL,
  session_code text UNIQUE NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- 2. Chat messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  is_question boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Emoji reactions (aggregate counts per emoji per session)
CREATE TABLE reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  count integer DEFAULT 0,
  UNIQUE(session_id, emoji)
);

-- 4. Polls
CREATE TABLE polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5. Poll options
CREATE TABLE poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  vote_count integer DEFAULT 0,
  display_order integer NOT NULL,
  color text NOT NULL DEFAULT '#6c5ce7'
);

-- 6. Poll votes (prevent duplicate votes)
CREATE TABLE poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_option_id uuid REFERENCES poll_options ON DELETE CASCADE NOT NULL,
  voter_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_option_id, voter_id)
);

-- 7. Question upvotes
CREATE TABLE question_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages ON DELETE CASCADE NOT NULL,
  voter_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, voter_id)
);

-- 8. Email captures (lead gen)
CREATE TABLE email_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  captured_at timestamptz DEFAULT now()
);

-- 9. Session ratings
CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  voter_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, voter_id)
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_messages_session ON messages(session_id, created_at);
CREATE INDEX idx_reactions_session ON reactions(session_id);
CREATE INDEX idx_polls_session ON polls(session_id);
CREATE INDEX idx_poll_options_poll ON poll_options(poll_id);
CREATE INDEX idx_poll_votes_option ON poll_votes(poll_option_id);
CREATE INDEX idx_question_upvotes_message ON question_upvotes(message_id);
CREATE INDEX idx_email_captures_session ON email_captures(session_id);
CREATE INDEX idx_ratings_session ON ratings(session_id);

-- ============================================
-- RPC: Atomic emoji reaction increment
-- ============================================
CREATE OR REPLACE FUNCTION increment_reaction(p_session_id uuid, p_emoji text)
RETURNS void AS $$
BEGIN
  INSERT INTO reactions (session_id, emoji, count)
  VALUES (p_session_id, p_emoji, 1)
  ON CONFLICT (session_id, emoji)
  DO UPDATE SET count = reactions.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Atomic poll vote (increments count + records vote)
-- ============================================
CREATE OR REPLACE FUNCTION cast_poll_vote(p_option_id uuid, p_voter_id text)
RETURNS boolean AS $$
DECLARE
  v_poll_id uuid;
  already_voted boolean;
BEGIN
  -- Get the poll_id for this option
  SELECT poll_id INTO v_poll_id FROM poll_options WHERE id = p_option_id;

  -- Check if this voter already voted on ANY option in this poll
  SELECT EXISTS(
    SELECT 1 FROM poll_votes pv
    JOIN poll_options po ON pv.poll_option_id = po.id
    WHERE po.poll_id = v_poll_id AND pv.voter_id = p_voter_id
  ) INTO already_voted;

  IF already_voted THEN
    RETURN false;
  END IF;

  -- Record the vote
  INSERT INTO poll_votes (poll_option_id, voter_id)
  VALUES (p_option_id, p_voter_id);

  -- Increment the vote count
  UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = p_option_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Toggle question upvote
-- ============================================
CREATE OR REPLACE FUNCTION toggle_question_upvote(p_message_id uuid, p_voter_id text)
RETURNS boolean AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM question_upvotes
  WHERE message_id = p_message_id AND voter_id = p_voter_id;

  IF existing_id IS NOT NULL THEN
    DELETE FROM question_upvotes WHERE id = existing_id;
    RETURN false; -- removed upvote
  ELSE
    INSERT INTO question_upvotes (message_id, voter_id)
    VALUES (p_message_id, p_voter_id);
    RETURN true; -- added upvote
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
