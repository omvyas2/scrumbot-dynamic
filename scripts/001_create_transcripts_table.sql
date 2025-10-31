-- Create transcripts table to store uploaded .vtt files
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  parsed_segments JSONB,
  segment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transcripts_created_at ON public.transcripts(created_at DESC);

-- Note: RLS is not enabled for simplicity. Add authentication later if needed.
