-- Fix: ensure owner can delete any invitation (including accepted ones)
-- The previous policy should cover this, but let's be explicit

DROP POLICY IF EXISTS "Owners manage invitations" ON invitations;
DROP POLICY IF EXISTS "Authenticated users can read invitations" ON invitations;

-- Owner has full control over their invitations
CREATE POLICY "Owners full control invitations" ON invitations
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone authenticated can READ an invitation by token (to accept it)
-- But only SELECT, not modify
CREATE POLICY "Authenticated read invitations" ON invitations
  FOR SELECT USING (auth.uid() IS NOT NULL);
