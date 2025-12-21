-- Naiya Initial Schema Migration
-- Creates tables, indexes, and RLS policies for local Supabase development
-- Run with: supabase db reset

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Calendars: One row per user storing their calendar events as JSONB
CREATE TABLE IF NOT EXISTS public.calendars (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  events JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.calendars IS 'Stores user calendar events as JSONB array. One row per user.';
COMMENT ON COLUMN public.calendars.events IS 'Array of CalendarEvent objects with fields: id, title, day/date, start, end, type, flexibility, etc.';

-- Deadlines: Track assignment/project deadlines
CREATE TABLE IF NOT EXISTS public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  course TEXT,
  due_date DATE NOT NULL,
  importance TEXT CHECK (importance IN ('low', 'medium', 'high')) DEFAULT 'medium',
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.deadlines IS 'User deadlines and assignments with importance levels.';
COMMENT ON COLUMN public.deadlines.importance IS 'Priority level: low, medium, or high';

-- Chat Sessions: Conversation history with Naiya AI
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb NOT NULL
);

COMMENT ON TABLE public.chat_sessions IS 'Stores chat conversation history with Naiya AI assistant.';
COMMENT ON COLUMN public.chat_sessions.messages IS 'Array of message objects with fields: role (user|assistant), content, timestamp.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Deadlines indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deadlines_user_id
  ON public.deadlines(user_id);

CREATE INDEX IF NOT EXISTS idx_deadlines_due_date
  ON public.deadlines(due_date);

CREATE INDEX IF NOT EXISTS idx_deadlines_user_due
  ON public.deadlines(user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_deadlines_completed
  ON public.deadlines(user_id, completed);

-- Chat sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON public.chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at
  ON public.chat_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_created
  ON public.chat_sessions(user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Calendars RLS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view own calendar"
  ON public.calendars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar"
  ON public.calendars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar"
  ON public.calendars FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar"
  ON public.calendars FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Deadlines RLS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view own deadlines"
  ON public.deadlines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deadlines"
  ON public.deadlines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deadlines"
  ON public.deadlines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deadlines"
  ON public.deadlines FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Chat Sessions RLS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view own chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
  ON public.chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger function to automatically update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to calendars table
CREATE TRIGGER update_calendars_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- GRANTS (for authenticated users)
-- ============================================================================

-- Note: RLS policies above already control access
-- These grants allow the postgres role to access tables
-- Authenticated users access via RLS policies

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.calendars TO authenticated;
GRANT ALL ON public.deadlines TO authenticated;
GRANT ALL ON public.chat_sessions TO authenticated;
