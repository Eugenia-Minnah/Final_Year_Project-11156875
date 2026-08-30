-- =========================================================
-- Smart Hostel Finder — Add map coordinates to hostels
-- Language: SQL (PostgreSQL)
-- Run this AFTER migrate_hostels_to_campus.sql
-- =========================================================

ALTER TABLE hostels ADD COLUMN latitude  NUMERIC(9,6);
ALTER TABLE hostels ADD COLUMN longitude NUMERIC(9,6);

-- Approximate real-world coordinates for the 3 sample hostels
UPDATE hostels SET latitude = 5.6510, longitude = -0.1859 WHERE name = 'Legon Hills Hostel';
UPDATE hostels SET latitude = 5.6484, longitude = -0.1901 WHERE name = 'Pentagon Student Lodge';
UPDATE hostels SET latitude = 6.6779, longitude = -1.5675 WHERE name = 'KNUST Green Court';

-- Verify
SELECT name, latitude, longitude FROM hostels;
