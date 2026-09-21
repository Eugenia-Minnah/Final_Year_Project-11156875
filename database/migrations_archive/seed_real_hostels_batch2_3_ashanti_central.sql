-- =========================================================
-- Smart Hostel Finder — REAL VERIFIED off-campus hostel dataset
-- Language: SQL (PostgreSQL)
--
-- BATCH 2: Ashanti (KNUST/Ayeduase) — 4 hostels
-- BATCH 3: Central (UCC/Amamoma) — 2 hostels
--
-- Uses the exact same columns/pattern as Batch 1 (Greater Accra), so
-- distance calculation, pagination, filtering, the map, and payments all
-- work identically with zero code changes — these are just new rows in
-- the same hostels/rooms tables everything already reads from.
--
-- Excluded from this batch (found but rejected, not silently skipped):
--   - Sambridge Hostel (Cape Coast) — multiple independent reviews
--     explicitly describe it as located ON UCC's campus grounds
--   - UCC Superannuation Hostel — ambiguous university-affiliated naming,
--     insufficient confidence it's a genuinely private property
--
-- Run AFTER seed_real_hostels_batch1_greater_accra.sql (reuses the same
-- "Hostel Directory (Unclaimed Listings)" placeholder owner account).
-- Safe to re-run: uses WHERE NOT EXISTS on hostel name.
-- =========================================================

-- ---------- BATCH 2: Ashanti (Ayeduase, near KNUST) ----------

-- Westend Hostel — named directly by KNUST's own official website
-- (knust.edu.gh/node/187) as one of three example off-campus hostels.
-- Coordinates confirmed via OpenStreetMap (tourism=hostel).
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  latitude, longitude, ownership_type, off_campus,
  source_name, source_url, is_verified, verified_at
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Westend Hostel',
  (SELECT id FROM regions WHERE name = 'Ashanti'),
  'Kumasi',
  'Ayeduase, near KNUST',
  'Private off-campus student hostel in Ayeduase, named directly by KNUST''s own official student housing page as one of the university''s recommended private hostel options. Not owned or managed by the university.',
  6.677924, -1.563351,
  'PRIVATE', TRUE,
  'knust.edu.gh (official) / OpenStreetMap', 'https://www.knust.edu.gh/node/187',
  TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Westend Hostel');

-- Glory Be To God Hostel — Ayeduase, confirmed via OpenStreetMap.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  latitude, longitude, ownership_type, off_campus,
  source_name, source_url, is_verified, verified_at
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Glory Be To God Hostel',
  (SELECT id FROM regions WHERE name = 'Ashanti'),
  'Kumasi',
  'Ayeduase, near KNUST',
  'Private off-campus student hostel in Ayeduase, roughly 250m from KNUST. Not affiliated with or owned by the university.',
  6.677377, -1.562794,
  'PRIVATE', TRUE,
  'OpenStreetMap (via mapcarta.com)', 'https://mapcarta.com/W356787170',
  TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Glory Be To God Hostel');

-- Lienda Ville — Ayeduase, confirmed via OpenStreetMap.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  latitude, longitude, ownership_type, off_campus,
  source_name, source_url, is_verified, verified_at
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Lienda Ville',
  (SELECT id FROM regions WHERE name = 'Ashanti'),
  'Kumasi',
  'Ayeduase, near KNUST',
  'Private off-campus student hostel in Ayeduase, near KNUST. Not affiliated with or owned by the university.',
  6.6752, -1.55352,
  'PRIVATE', TRUE,
  'OpenStreetMap (via mapcarta.com)', 'https://mapcarta.com/W1188207626',
  TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Lienda Ville');

-- Fortune Royal Hostels — Ayeduase, confirmed via OpenStreetMap.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  latitude, longitude, ownership_type, off_campus,
  source_name, source_url, is_verified, verified_at
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Fortune Royal Hostels',
  (SELECT id FROM regions WHERE name = 'Ashanti'),
  'Kumasi',
  'Ayeduase, near KNUST',
  'Private off-campus student hostel in Ayeduase, near KNUST. Not affiliated with or owned by the university.',
  6.67179, -1.55626,
  'PRIVATE', TRUE,
  'OpenStreetMap (via mapcarta.com)', 'https://mapcarta.com/N11396120832',
  TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Fortune Royal Hostels');

-- ---------- BATCH 3: Central (Amamoma, near UCC) ----------

-- Jodok — all-female off-campus hostel, independently confirmed by both
-- GetRooms (identity/description) and OpenStreetMap (location).
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  latitude, longitude, ownership_type, off_campus,
  source_name, source_url, is_verified, verified_at
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Jodok',
  (SELECT id FROM regions WHERE name = 'Central'),
  'Cape Coast',
  'Amamoma, near University of Cape Coast',
  'Private off-campus all-female student hostel in Amamoma, close to University of Cape Coast (UCC). Not affiliated with or owned by the university.',
  5.112542, -1.291547,
  'PRIVATE', TRUE,
  'GetRooms / OpenStreetMap (via mapcarta.com)', 'https://mapcarta.com/N6510986099',
  TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Jodok');

-- Success City Hostel — Amamoma, confirmed via OpenStreetMap.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  latitude, longitude, ownership_type, off_campus,
  source_name, source_url, is_verified, verified_at
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Success City Hostel',
  (SELECT id FROM regions WHERE name = 'Central'),
  'Cape Coast',
  'Amamoma, near University of Cape Coast',
  'Private off-campus student hostel in Amamoma, close to University of Cape Coast (UCC). Not affiliated with or owned by the university.',
  5.114135, -1.297793,
  'PRIVATE', TRUE,
  'OpenStreetMap (via mapcarta.com)', 'https://mapcarta.com/N10606572239',
  TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Success City Hostel');

-- ---------- VERIFICATION SUMMARY ----------
-- Batch 2 (Ashanti): 4 verified with coordinates, 0 excluded found needing exclusion
-- Batch 3 (Central): 2 verified with coordinates, 2 excluded (on-campus/ambiguous)
-- Phone numbers: none verified for any of these 6 — left NULL
-- Sources: knust.edu.gh (official), GetRooms, OpenStreetMap via mapcarta.com

SELECT name, city, latitude, longitude, is_verified, source_name
FROM hostels
WHERE name IN ('Westend Hostel', 'Glory Be To God Hostel', 'Lienda Ville', 'Fortune Royal Hostels', 'Jodok', 'Success City Hostel')
ORDER BY city, name;
