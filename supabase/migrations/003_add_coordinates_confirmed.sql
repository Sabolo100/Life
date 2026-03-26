-- Migration: Add coordinates_confirmed column to locations table
-- This column tracks whether a user has verified the geocoded position of a location

ALTER TABLE locations ADD COLUMN IF NOT EXISTS coordinates_confirmed boolean DEFAULT false;
