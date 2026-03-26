-- Migration 004: Multi-user invitation system, sharing & contributions
-- Enables family/friends to contribute memories, comments, edits to a life story

-- ═══════════════════════════════════════════════════════════════════════
-- 1. UPDATE INVITATIONS TABLE (exists from 001, add missing columns)
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users ON DELETE SET NULL;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invited_name text;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Drop old policy and add new ones
DROP POLICY IF EXISTS "Users can manage own invitations" ON invitations;

-- Owner can do everything with their invitations
CREATE POLICY "Owners manage invitations" ON invitations
  FOR ALL USING (auth.uid() = user_id);

-- Anyone logged in can read an invitation (needed to accept by token)
CREATE POLICY "Authenticated users can read invitations" ON invitations
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ═══════════════════════════════════════════════════════════════════════
-- 2. LIFE STORY SHARES - Active sharing relationships
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS life_story_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  shared_with_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  invitation_id uuid REFERENCES invitations ON DELETE SET NULL,
  permission_level text NOT NULL DEFAULT 'reader'
    CHECK (permission_level IN ('reader', 'commenter', 'contributor', 'editor')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, shared_with_id)
);

ALTER TABLE life_story_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage all shares of their life story
CREATE POLICY "Owners manage shares" ON life_story_shares
  FOR ALL USING (auth.uid() = owner_id);

-- Shared users can read their own share records
CREATE POLICY "Shared users read own shares" ON life_story_shares
  FOR SELECT USING (auth.uid() = shared_with_id);


-- ═══════════════════════════════════════════════════════════════════════
-- 3. CONTRIBUTIONS - Content from shared users (pending approval)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  contributor_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  contributor_name text,
  contribution_type text NOT NULL DEFAULT 'memory'
    CHECK (contribution_type IN ('memory', 'comment', 'edit_suggestion')),
  target_entity_type text,  -- 'event', 'person', 'location', null (new memory)
  target_entity_id uuid,    -- FK to the entity being commented on / edited
  title text,
  content jsonb NOT NULL DEFAULT '{}',
  -- content structure for 'memory':
  --   { description, time_info, category, related_persons[], location_name }
  -- content structure for 'comment':
  --   { text }
  -- content structure for 'edit_suggestion':
  --   { field, old_value, new_value, reason }
  perspective_type text NOT NULL DEFAULT 'other_memory'
    CHECK (perspective_type IN ('own_memory', 'other_memory', 'shared_memory', 'disputed_memory')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'modified')),
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Owner (life story owner) can read and manage all contributions to their story
CREATE POLICY "Owners manage contributions" ON contributions
  FOR ALL USING (auth.uid() = owner_id);

-- Contributors can read their own contributions
CREATE POLICY "Contributors read own" ON contributions
  FOR SELECT USING (auth.uid() = contributor_id);

-- Contributors can insert if they have a valid share with contributor+ permission
CREATE POLICY "Contributors can insert" ON contributions
  FOR INSERT WITH CHECK (
    auth.uid() = contributor_id
    AND EXISTS (
      SELECT 1 FROM life_story_shares lss
      WHERE lss.owner_id = contributions.owner_id
        AND lss.shared_with_id = auth.uid()
        AND lss.permission_level IN ('commenter', 'contributor', 'editor')
        AND (lss.expires_at IS NULL OR lss.expires_at > now())
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- 4. ADD CONTRIBUTOR TRACKING TO EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE events ADD COLUMN IF NOT EXISTS contributor_id uuid REFERENCES auth.users ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS perspective_type text DEFAULT 'own_memory';
ALTER TABLE events ADD COLUMN IF NOT EXISTS contribution_id uuid;
ALTER TABLE events ADD COLUMN IF NOT EXISTS narrative_text text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_message_id uuid;

-- Update source check constraint to include new values
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE events ADD CONSTRAINT events_source_check
  CHECK (source IN ('self', 'invited_person'));


-- ═══════════════════════════════════════════════════════════════════════
-- 5. SHARED ACCESS RLS POLICIES (read-only for shared users)
-- ═══════════════════════════════════════════════════════════════════════

-- Helper: check if user has active share
-- (Used inline in policies since Supabase doesn't support custom functions easily in RLS)

-- Events: shared users can read
CREATE POLICY "Shared users can read events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM life_story_shares lss
      WHERE lss.owner_id = events.user_id
        AND lss.shared_with_id = auth.uid()
        AND (lss.expires_at IS NULL OR lss.expires_at > now())
    )
  );

-- Persons: shared users can read
CREATE POLICY "Shared users can read persons" ON persons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM life_story_shares lss
      WHERE lss.owner_id = persons.user_id
        AND lss.shared_with_id = auth.uid()
        AND (lss.expires_at IS NULL OR lss.expires_at > now())
    )
  );

-- Locations: shared users can read
CREATE POLICY "Shared users can read locations" ON locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM life_story_shares lss
      WHERE lss.owner_id = locations.user_id
        AND lss.shared_with_id = auth.uid()
        AND (lss.expires_at IS NULL OR lss.expires_at > now())
    )
  );

-- Life stories: shared users can read
CREATE POLICY "Shared users can read life stories" ON life_stories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM life_story_shares lss
      WHERE lss.owner_id = life_stories.user_id
        AND lss.shared_with_id = auth.uid()
        AND (lss.expires_at IS NULL OR lss.expires_at > now())
    )
  );

-- Time periods: shared users can read
CREATE POLICY "Shared users can read time_periods" ON time_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM life_story_shares lss
      WHERE lss.owner_id = time_periods.user_id
        AND lss.shared_with_id = auth.uid()
        AND (lss.expires_at IS NULL OR lss.expires_at > now())
    )
  );

-- Emotions: shared users can read
CREATE POLICY "Shared users can read emotions" ON emotions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM life_story_shares lss
      WHERE lss.owner_id = emotions.user_id
        AND lss.shared_with_id = auth.uid()
        AND (lss.expires_at IS NULL OR lss.expires_at > now())
    )
  );

-- Family relationships: shared users can read
CREATE POLICY "Shared users can read family_relationships" ON family_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM life_story_shares lss
      WHERE lss.owner_id = family_relationships.user_id
        AND lss.shared_with_id = auth.uid()
        AND (lss.expires_at IS NULL OR lss.expires_at > now())
    )
  );

-- Profiles: shared users can read the owner's profile (for display name)
CREATE POLICY "Shared users can read owner profile" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM life_story_shares lss
      WHERE lss.owner_id = profiles.id
        AND lss.shared_with_id = auth.uid()
        AND (lss.expires_at IS NULL OR lss.expires_at > now())
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- 6. INDEX FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON life_story_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner ON life_story_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_contributions_owner ON contributions(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_contributions_contributor ON contributions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
