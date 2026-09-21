-- =========================================================
-- Smart Hostel Finder — Location model redesign
-- Language: SQL (PostgreSQL)
--
-- PROBLEM THIS FIXES: universities.region_id locked every university to a
-- single region, so "University of Ghana" could never appear under Ashanti
-- even though it has a real campus in Kumasi. This migration moves region
-- and city onto CAMPUSES (where they actually belong), and gives HOSTELS
-- their own independent region/city/coordinates instead of depending on
-- a fixed campus_id — matching how hostels work in real life (a hostel is
-- a physical property; its distance to any nearby campus is calculated,
-- not hard-coded).
-- =========================================================

-- ---------- 1. Campuses get their own region + city ----------
-- (latitude/longitude columns already exist from an earlier migration)
ALTER TABLE campuses ADD COLUMN region_id INTEGER REFERENCES regions(id);
ALTER TABLE campuses ADD COLUMN city VARCHAR(100);

-- Assign each existing campus to its REAL region/city — this is the key fix.
-- Note some universities (e.g. University of Ghana, GIMPA) now correctly
-- appear under multiple regions, because they have real campuses in each.
UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Greater Accra'), city = 'Accra'
WHERE name IN ('Legon Campus', 'Korle-Bu Campus', 'Accra City Campus', 'Achimota Campus', 'UPSA Campus, Accra', 'Accra Campus');

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Ashanti'), city = 'Kumasi'
WHERE name = 'Kumasi Campus' OR name = 'Kumasi City Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Ashanti'), city = 'Mampong'
WHERE name = 'Mampong Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Ashanti'), city = 'Agogo'
WHERE name = 'Agogo Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Western'), city = 'Takoradi'
WHERE name = 'Takoradi City Campus' OR name = 'Takoradi Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Western'), city = 'Tarkwa'
WHERE name = 'Tarkwa Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Central'), city = 'Cape Coast'
WHERE name = 'Cape Coast Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Central'), city = 'Winneba'
WHERE name = 'Winneba Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Central'), city = 'Ajumako'
WHERE name = 'Ajumako Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Eastern'), city = 'Koforidua'
WHERE name = 'Koforidua Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Eastern'), city = 'Abetifi'
WHERE name = 'Abetifi Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Eastern'), city = 'Akropong'
WHERE name = 'Akropong Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Volta'), city = 'Ho'
WHERE name = 'Ho Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Bono'), city = 'Sunyani'
WHERE name = 'Sunyani Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Bono'), city = 'Sunyani'
WHERE name = 'Fiapre Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Northern'), city = 'Tamale'
WHERE name = 'Tamale Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Northern'), city = 'Nyankpala'
WHERE name = 'Nyankpala Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Upper East'), city = 'Navrongo'
WHERE name = 'Navrongo Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Upper East'), city = 'Bolgatanga'
WHERE name = 'Bolgatanga Campus';

UPDATE campuses SET region_id = (SELECT id FROM regions WHERE name = 'Upper West'), city = 'Wa'
WHERE name = 'Wa Campus';

-- Coordinates for the extra towns we now recognise (approximate town-centre
-- coordinates — refine anytime by right-clicking the exact spot on Google Maps).
UPDATE campuses SET latitude = 5.1053, longitude = -1.2466 WHERE name = 'Cape Coast Campus';
UPDATE campuses SET latitude = 5.3511, longitude = -0.6231 WHERE name = 'Winneba Campus';
UPDATE campuses SET latitude = 5.2183, longitude = -0.8564 WHERE name = 'Ajumako Campus';
UPDATE campuses SET latitude = 6.0940, longitude = -0.2591 WHERE name = 'Koforidua Campus';
UPDATE campuses SET latitude = 6.6002, longitude = 0.4713  WHERE name = 'Ho Campus';
UPDATE campuses SET latitude = 5.3006, longitude = -1.9909 WHERE name = 'Tarkwa Campus';
UPDATE campuses SET latitude = 4.9016, longitude = -1.7831 WHERE name = 'Takoradi City Campus';
UPDATE campuses SET latitude = 4.9016, longitude = -1.7831 WHERE name = 'Takoradi Campus';
UPDATE campuses SET latitude = 7.3349, longitude = -2.3123 WHERE name = 'Sunyani Campus';
UPDATE campuses SET latitude = 7.3200, longitude = -2.2900 WHERE name = 'Fiapre Campus';
UPDATE campuses SET latitude = 9.4008, longitude = -0.8393 WHERE name = 'Tamale Campus';
UPDATE campuses SET latitude = 9.3966, longitude = -0.9852 WHERE name = 'Nyankpala Campus';
UPDATE campuses SET latitude = 10.8956, longitude = -1.0919 WHERE name = 'Navrongo Campus';
UPDATE campuses SET latitude = 10.7856, longitude = -0.8514 WHERE name = 'Bolgatanga Campus';
UPDATE campuses SET latitude = 10.0601, longitude = -2.5099 WHERE name = 'Wa Campus';
UPDATE campuses SET latitude = 6.6885, longitude = -1.6244 WHERE name = 'Kumasi City Campus';
UPDATE campuses SET latitude = 6.6926, longitude = -1.5716 WHERE name = 'Achimota Campus'; -- placeholder, see note below
UPDATE campuses SET latitude = 5.6234, longitude = -0.1719 WHERE name = 'UPSA Campus, Accra';
UPDATE campuses SET latitude = 5.5563, longitude = -0.1969 WHERE name = 'Accra Campus';
UPDATE campuses SET latitude = 5.5502, longitude = -0.2288 WHERE name = 'Korle-Bu Campus';
UPDATE campuses SET latitude = 6.7590, longitude = -1.5763 WHERE name = 'Mampong Campus';
UPDATE campuses SET latitude = 6.7994, longitude = -1.0819 WHERE name = 'Agogo Campus';
UPDATE campuses SET latitude = 5.5850, longitude = -0.2260 WHERE name = 'Abetifi Campus'; -- placeholder, see note
UPDATE campuses SET latitude = 6.0865, longitude = -0.0765 WHERE name = 'Akropong Campus';

-- Fix the Achimota Campus coordinates (GIMPA is actually in Achimota, Accra,
-- not the Ashanti coordinates accidentally used above)
UPDATE campuses SET latitude = 5.6156, longitude = -0.2298 WHERE name = 'Achimota Campus';
-- Fix Abetifi Campus (Eastern Region, Kwahu — not the placeholder Accra coords above)
UPDATE campuses SET latitude = 6.6667, longitude = -0.7500 WHERE name = 'Abetifi Campus';

-- ---------- 2. Hostels get their OWN region/city/coordinates ----------
-- This is the other key fix: a hostel is a physical property, not a child
-- record of one campus. campus_id is kept (nullable) for backward reference,
-- but it is no longer what search relies on — distance calculation is.
ALTER TABLE hostels ADD COLUMN region_id INTEGER REFERENCES regions(id);
ALTER TABLE hostels ADD COLUMN city VARCHAR(100);
ALTER TABLE hostels ADD COLUMN has_wifi    BOOLEAN DEFAULT FALSE;
ALTER TABLE hostels ADD COLUMN has_parking BOOLEAN DEFAULT FALSE;

-- Give the 3 sample hostels their own region/city, inherited sensibly from
-- whichever campus they were previously linked to (a fine starting point).
UPDATE hostels h
SET region_id = c.region_id, city = c.city
FROM campuses c
WHERE h.campus_id = c.id AND h.region_id IS NULL;

-- Verify: University of Ghana should now show under BOTH Greater Accra and Ashanti
SELECT u.name AS university, c.name AS campus, r.name AS region, c.city
FROM campuses c
JOIN universities u ON u.id = c.university_id
JOIN regions r ON r.id = c.region_id
WHERE u.abbreviation = 'UG'
ORDER BY r.name;
