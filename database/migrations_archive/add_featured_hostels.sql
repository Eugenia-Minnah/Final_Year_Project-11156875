-- =========================================================
-- Smart Hostel Finder — Featured hostels for the landing page
-- Language: SQL (PostgreSQL)
--
-- The landing page must NEVER dump the entire hostel database on visitors.
-- This adds a simple boolean an admin/owner can toggle to curate a small
-- "Featured Hostels" selection, separate from the full searchable database.
-- =========================================================

ALTER TABLE hostels ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;

-- Feature a small, sensible starting selection: verified hostels with
-- confirmed coordinates make the best first impression (they can show a
-- real map pin), so start there rather than picking arbitrarily.
UPDATE hostels SET featured = TRUE
WHERE is_verified = TRUE AND latitude IS NOT NULL
LIMIT 8;
