-- Migration: Allow 'ex_spouse' as a valid relationship_type in family_relationships
-- Dynamically removes any existing CHECK constraint on relationship_type and adds a new one

DO $$
DECLARE
  r record;
BEGIN
  -- Find and drop any check constraint that references relationship_type
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.family_relationships'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%relationship_type%'
  )
  LOOP
    EXECUTE 'ALTER TABLE family_relationships DROP CONSTRAINT ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END;
$$;

-- Add updated constraint that includes ex_spouse
ALTER TABLE family_relationships
  ADD CONSTRAINT family_relationships_relationship_type_check
  CHECK (relationship_type IN ('parent', 'child', 'spouse', 'ex_spouse', 'sibling'));
