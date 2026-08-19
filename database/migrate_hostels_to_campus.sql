-- =========================================================
-- Smart Hostel Finder — Link existing hostels to the new campus hierarchy
-- Language: SQL (PostgreSQL)
-- Run this AFTER regions_universities_seed.sql
-- =========================================================

-- The old free-text "region" column is no longer required going forward —
-- new hostels will be linked through campus_id instead. We keep the column
-- (and its old data) so nothing breaks, we just stop requiring it.
ALTER TABLE hostels ALTER COLUMN region DROP NOT NULL;

-- Link the 3 sample hostels from seed.sql to real campuses
UPDATE hostels
SET campus_id = (
  SELECT c.id FROM campuses c
  JOIN universities u ON u.id = c.university_id
  WHERE u.abbreviation = 'UG' AND c.name = 'Legon Campus'
)
WHERE name IN ('Legon Hills Hostel', 'Pentagon Student Lodge');

UPDATE hostels
SET campus_id = (
  SELECT c.id FROM campuses c
  JOIN universities u ON u.id = c.university_id
  WHERE u.abbreviation = 'KNUST' AND c.name = 'Kumasi Campus'
)
WHERE name = 'KNUST Green Court';

-- Verify: this should show all 3 hostels with a real campus/university/region attached
SELECT h.name AS hostel, c.name AS campus, u.name AS university, r.name AS region
FROM hostels h
JOIN campuses c ON c.id = h.campus_id
JOIN universities u ON u.id = c.university_id
JOIN regions r ON r.id = u.region_id;
