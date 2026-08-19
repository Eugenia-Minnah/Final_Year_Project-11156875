-- =========================================================
-- Smart Hostel Finder — Patch: add campus coordinates
-- Language: SQL (PostgreSQL)
-- =========================================================

ALTER TABLE campuses ADD COLUMN latitude  NUMERIC(9,6);
ALTER TABLE campuses ADD COLUMN longitude NUMERIC(9,6);

UPDATE campuses SET latitude = 5.6494, longitude = -0.1870 WHERE name = 'Legon Campus';
UPDATE campuses SET latitude = 6.6745, longitude = -1.5716 WHERE name = 'Kumasi Campus';
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
UPDATE campuses SET latitude = 5.6234, longitude = -0.1719 WHERE name = 'UPSA Campus, Accra';
UPDATE campuses SET latitude = 5.5563, longitude = -0.1969 WHERE name = 'Accra Campus';
UPDATE campuses SET latitude = 5.5502, longitude = -0.2288 WHERE name = 'Korle-Bu Campus';
UPDATE campuses SET latitude = 6.7590, longitude = -1.5763 WHERE name = 'Mampong Campus';
UPDATE campuses SET latitude = 6.7994, longitude = -1.0819 WHERE name = 'Agogo Campus';
UPDATE campuses SET latitude = 6.0865, longitude = -0.0765 WHERE name = 'Akropong Campus';
UPDATE campuses SET latitude = 5.6156, longitude = -0.2298 WHERE name = 'Achimota Campus';
UPDATE campuses SET latitude = 6.6667, longitude = -0.7500 WHERE name = 'Abetifi Campus';

SELECT c.name, r.name AS region, c.latitude, c.longitude
FROM campuses c
LEFT JOIN regions r ON r.id = c.region_id
ORDER BY r.name, c.name;