-- Migration 007: Create a function to reliably get display names
-- This bypasses RLS issues and provides email fallback when display_name is null.

CREATE OR REPLACE FUNCTION get_profile_display_names(user_ids uuid[])
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      SPLIT_PART(u.email, '@', 1),
      'Ismeretlen'
    ) AS display_name
  FROM unnest(user_ids) AS uid(id)
  JOIN auth.users u ON u.id = uid.id
  LEFT JOIN profiles p ON p.id = uid.id;
$$;
