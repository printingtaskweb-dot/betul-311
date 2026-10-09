-- ==============================================================================
-- SUPABASE SQL EDITOR SCRIPT: LOCAL AREA NEWS & THOUGHTS (MODERATED COMMUNITY FEED)
-- ==============================================================================
-- This script creates the `local_news` table for citizen nearby updates and thoughts.
-- Moderation rule: Citizens submit posts with status = 'pending'.
-- ONLY 'approved' posts are visible to the public.
-- Admins review, approve, reject, or delete posts from the Admin Dashboard.
-- ==============================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.local_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_phone TEXT,
  area TEXT NOT NULL,                     -- Locality / Ward / Area (e.g. "Ganj", "Kothi Bazar", "Civil Lines")
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('news', 'alert', 'event', 'thought', 'general')),
  title TEXT,                             -- Short headline (optional)
  content TEXT NOT NULL,                  -- Main message / thought / news update
  photo_url TEXT,                         -- Optional uploaded image URL
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_local_news_status_created_at ON public.local_news (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_local_news_area ON public.local_news (area);

-- 3. Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.update_local_news_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_local_news_updated_at ON public.local_news;
CREATE TRIGGER trigger_local_news_updated_at
BEFORE UPDATE ON public.local_news
FOR EACH ROW
EXECUTE FUNCTION public.update_local_news_timestamp();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.local_news ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Policy A: Everyone (anon and authenticated) can read ONLY 'approved' posts
DROP POLICY IF EXISTS "Public can view approved local news" ON public.local_news;
CREATE POLICY "Public can view approved local news"
ON public.local_news
FOR SELECT
USING (status = 'approved');

-- Policy B: Authenticated Admins can view ALL posts (pending, approved, rejected)
DROP POLICY IF EXISTS "Admins can view all local news" ON public.local_news;
CREATE POLICY "Admins can view all local news"
ON public.local_news
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (user_profiles.is_admin = true OR user_profiles.role = 'admin')
  )
);

-- Policy C: Anyone (citizens) can submit new thoughts/news, always forced as 'pending'
DROP POLICY IF EXISTS "Anyone can submit pending local news" ON public.local_news;
CREATE POLICY "Anyone can submit pending local news"
ON public.local_news
FOR INSERT
WITH CHECK (status = 'pending');

-- Policy D: Admins can update (approve / reject / edit) posts
DROP POLICY IF EXISTS "Admins can update local news" ON public.local_news;
CREATE POLICY "Admins can update local news"
ON public.local_news
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (user_profiles.is_admin = true OR user_profiles.role = 'admin')
  )
);

-- Policy E: Admins can delete posts
DROP POLICY IF EXISTS "Admins can delete local news" ON public.local_news;
CREATE POLICY "Admins can delete local news"
ON public.local_news
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (user_profiles.is_admin = true OR user_profiles.role = 'admin')
  )
);

-- 6. RPC Function for citizens to like thoughts without needing admin privileges
CREATE OR REPLACE FUNCTION public.increment_local_news_likes(news_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.local_news
  SET likes_count = COALESCE(likes_count, 0) + 1
  WHERE id = news_id AND status = 'approved';
END;
$$;

-- Grant execution to public & authenticated
GRANT EXECUTE ON FUNCTION public.increment_local_news_likes(UUID) TO anon, authenticated;

-- 7. Optional: Delete dummy demo records if any were previously inserted
DELETE FROM public.local_news 
WHERE author_name IN ('Ramesh Verma', 'Sunita Patil', 'Amit Sharma');

