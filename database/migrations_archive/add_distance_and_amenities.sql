-- =========================================================
-- Smart Hostel Finder — Distance & amenities support
-- Language: SQL (PostgreSQL)
-- =========================================================

-- ---------- 1. Campus coordinates (needed to calculate distance) ----------
ALTER TABLE campuses ADD COLUMN latitude  NUMERIC(9,6);
ALTER TABLE campuses ADD COLUMN longitude NUMERIC(9,6);

-- Approximate coordinates for the campuses currently used by seeded hostels.
-- (Add more as you add hostels in other campuses — see note at the bottom.)
UPDATE campuses SET latitude = 5.6494, longitude = -0.1870
WHERE name = 'Legon Campus' AND university_id = (SELECT id FROM universities WHERE abbreviation = 'UG');

UPDATE campuses SET latitude = 6.6745, longitude = -1.5716
WHERE name = 'Kumasi Campus' AND university_id = (SELECT id FROM universities WHERE abbreviation = 'KNUST');

-- ---------- 2. Let a student record which campus they attend ----------
ALTER TABLE users ADD COLUMN home_campus_id INTEGER REFERENCES campuses(id);

-- ---------- 3. More hostel amenities beyond CCTV/shuttle ----------
ALTER TABLE hostels ADD COLUMN has_security_guard   BOOLEAN DEFAULT FALSE;
ALTER TABLE hostels ADD COLUMN has_water_supply      BOOLEAN DEFAULT TRUE;
ALTER TABLE hostels ADD COLUMN has_electricity_backup BOOLEAN DEFAULT FALSE;

-- Give the 3 sample hostels some example amenity data
UPDATE hostels SET has_security_guard = TRUE, has_electricity_backup = TRUE WHERE name = 'Legon Hills Hostel';
UPDATE hostels SET has_security_guard = TRUE WHERE name = 'Pentagon Student Lodge';
UPDATE hostels SET has_security_guard = TRUE, has_electricity_backup = TRUE WHERE name = 'KNUST Green Court';

-- NOTE: Coordinates for campuses beyond Legon and Kumasi are not filled in yet.
-- To add one later, look up the town on Google Maps, right-click the exact
-- spot, and copy the coordinates it shows, then run something like:
-- UPDATE campuses SET latitude = 0.000000, longitude = 0.000000 WHERE name = '...';
