-- Migration 006: Allow authenticated users to read other profiles' display_name
--
-- Problem: The original RLS policy only allowed users to read their own profile.
-- This means when user A shares with user B, user B cannot look up user A's display_name,
-- causing "Valaki" (Someone) to appear everywhere instead of the real name.
--
-- Fix: Add a broader SELECT policy so any authenticated user can read profiles.
-- This is appropriate for a sharing app where display names are semi-public.
-- Sensitive fields (privacy_accepted_at, storage_preference) remain write-protected.

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
