-- Complete rewrite to use normalized schema with proper foreign keys and constraints

-- Create tables for team member CSV data
-- This is a one-time setup for storing team information
-- Schema follows normalized design with proper relationships

-- Core team members table
CREATE TABLE IF NOT EXISTS team_members (
  member_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  time_zone TEXT,
  seniority TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sprints table for tracking sprint periods
CREATE TABLE IF NOT EXISTS sprints (
  sprint_id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Member capacity per sprint
CREATE TABLE IF NOT EXISTS member_capacity (
  member_id TEXT REFERENCES team_members(member_id) ON DELETE CASCADE,
  sprint_id TEXT REFERENCES sprints(sprint_id) ON DELETE CASCADE,
  hours_available INTEGER NOT NULL CHECK (hours_available >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (member_id, sprint_id)
);

-- Member preferences (many-to-many: one member can want to learn multiple things)
CREATE TABLE IF NOT EXISTS member_preferences (
  member_id TEXT REFERENCES team_members(member_id) ON DELETE CASCADE,
  wants_to_learn TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (member_id, wants_to_learn)
);

-- Skills master table
CREATE TABLE IF NOT EXISTS skills (
  skill TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Member skills (many-to-many with additional attributes)
CREATE TABLE IF NOT EXISTS member_skills (
  member_id TEXT REFERENCES team_members(member_id) ON DELETE CASCADE,
  skill TEXT REFERENCES skills(skill) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 10),
  last_used DATE NULL,
  evidence_links TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (member_id, skill)
);

-- Stories master table
CREATE TABLE IF NOT EXISTS stories (
  story_id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Story history (many-to-many: multiple members can work on same story)
CREATE TABLE IF NOT EXISTS story_history (
  story_id TEXT REFERENCES stories(story_id) ON DELETE CASCADE,
  member_id TEXT REFERENCES team_members(member_id) ON DELETE CASCADE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'fail', 'partial', 'unknown')),
  cycle_time_days INTEGER NOT NULL CHECK (cycle_time_days >= 0),
  quality_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (story_id, member_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_member_capacity_member ON member_capacity(member_id);
CREATE INDEX IF NOT EXISTS idx_member_capacity_sprint ON member_capacity(sprint_id);
CREATE INDEX IF NOT EXISTS idx_member_skills_member ON member_skills(member_id);
CREATE INDEX IF NOT EXISTS idx_member_skills_skill ON member_skills(skill);
CREATE INDEX IF NOT EXISTS idx_story_history_member ON story_history(member_id);
CREATE INDEX IF NOT EXISTS idx_story_history_tags ON story_history USING GIN(tags);

-- Add a metadata table to track CSV uploads
CREATE TABLE IF NOT EXISTS csv_upload_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  rows_imported INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
