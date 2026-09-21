-- =========================================================
-- Smart Hostel Finder — REAL VERIFIED off-campus hostel dataset
-- Language: SQL (PostgreSQL)
--
-- BATCH 7: Northern (UDS/Tamale) — 1 hostel
-- BATCH 9: Upper East (CKT-UTAS/Navrongo) — 1 hostel
--
-- Same pattern as all previous batches — new rows only, same columns,
-- works automatically with distance calculation, pagination, filtering,
-- the map, and payments with zero code changes.
--
-- Run AFTER seed_real_hostels_batch2_3_ashanti_central.sql.
-- Safe to re-run: uses WHERE NOT EXISTS on hostel name.
-- =========================================================

-- ---------- BATCH 7: Northern (near UDS, Tamale) ----------

-- GUSS Hostel — confirmed via OpenStreetMap (tourism=hostel), 370m from
-- UDS Tamale Campus.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  latitude, longitude, ownership_type, off_campus,
  source_name, source_url, is_verified, verified_at
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'GUSS Hostel',
  (SELECT id FROM regions WHERE name = 'Northern'),
  'Tamale',
  'Near University for Development Studies, Tamale Campus',
  'Private off-campus student hostel roughly 370m from University for Development Studies (UDS), Tamale Campus. Not affiliated with or owned by the university.',
  9.37051, -0.88246,
  'PRIVATE', TRUE,
  'OpenStreetMap (via mapcarta.com)', 'https://mapcarta.com/N6544044351',
  TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'GUSS Hostel');

-- ---------- BATCH 9: Upper East (near CKT-UTAS, Navrongo) ----------

-- Dollar hostel — confirmed via OpenStreetMap (tourism=hostel), ~410m
-- from C.K. Tedam University of Technology & Applied Sciences.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  latitude, longitude, ownership_type, off_campus,
  source_name, source_url, is_verified, verified_at
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Dollar hostel',
  (SELECT id FROM regions WHERE name = 'Upper East'),
  'Navrongo',
  'Near C. K. Tedam University of Technology and Applied Sciences',
  'Private off-campus student hostel roughly 410m from C. K. Tedam University of Technology and Applied Sciences (CKT-UTAS), Navrongo Campus. Not affiliated with or owned by the university.',
  10.863837, -1.07886,
  'PRIVATE', TRUE,
  'OpenStreetMap (via mapcarta.com)', 'https://mapcarta.com/N4567971489',
  TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Dollar hostel');

-- ---------- VERIFICATION SUMMARY ----------
SELECT name, city, latitude, longitude, is_verified, source_name
FROM hostels
WHERE name IN ('GUSS Hostel', 'Dollar hostel')
ORDER BY city, name;
