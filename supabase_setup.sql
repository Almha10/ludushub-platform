-- ============================================================
-- ArenaHub Club System: Schema + RLS Fix Migration
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Add missing columns to clubs table
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. Ensure club_applications table has all required columns
-- (Run only if table exists; if not, create it)
CREATE TABLE IF NOT EXISTS club_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one active pending application per user per club
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_application
  ON club_applications (club_id, user_id)
  WHERE status = 'pending';

-- 3. Spaces System: Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_tag TEXT,
  game TEXT,
  content TEXT,
  likes INTEGER DEFAULT 0,
  reposts INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  is_looking_for_team BOOLEAN DEFAULT false,
  media TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can insert their own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. Supabase Storage: Create bucket for club-assets
-- (Do this via Supabase dashboard Storage tab OR uncomment if using service role)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('club-assets', 'club-assets', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on club_applications
ALTER TABLE club_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Players can insert their own applications" ON club_applications;
DROP POLICY IF EXISTS "Players can view their own applications" ON club_applications;
DROP POLICY IF EXISTS "Club admins can view all applications for their club" ON club_applications;
DROP POLICY IF EXISTS "Club admins can update application status" ON club_applications;

-- POLICY 1: Authenticated players can submit an application
CREATE POLICY "Players can insert their own applications"
  ON club_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- POLICY 2: Players can view their own applications
CREATE POLICY "Players can view their own applications"
  ON club_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- POLICY 3: Club owner/admin can view all applications for their club
CREATE POLICY "Club admins can view all applications for their club"
  ON club_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_applications.club_id
        AND clubs.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_applications.club_id
        AND club_members.user_id = auth.uid()
        AND lower(club_members.role) IN ('owner', 'admin', 'club_admin')
    )
  );

-- POLICY 4: Club owner/admin can update application status
CREATE POLICY "Club admins can update application status"
  ON club_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_applications.club_id
        AND clubs.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_applications.club_id
        AND club_members.user_id = auth.uid()
        AND lower(club_members.role) IN ('owner', 'admin', 'club_admin')
    )
  )
  WITH CHECK (true);

-- ============================================================
-- clubs table RLS
-- ============================================================
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view clubs" ON clubs;
DROP POLICY IF EXISTS "Owner can update club" ON clubs;

CREATE POLICY "Anyone can view clubs"
  ON clubs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Owner can update club"
  ON clubs FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================
-- Storage RLS for club-assets bucket
-- ============================================================
-- After creating bucket manually, run:
DROP POLICY IF EXISTS "Anyone can view club-assets" ON storage.objects;
DROP POLICY IF EXISTS "Club admins can upload to club-assets" ON storage.objects;
DROP POLICY IF EXISTS "Club admins can delete from club-assets" ON storage.objects;

CREATE POLICY "Anyone can view club-assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'club-assets');

CREATE POLICY "Club admins can upload to club-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'club-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Club admins can delete from club-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'club-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
