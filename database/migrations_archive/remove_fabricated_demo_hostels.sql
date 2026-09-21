-- =========================================================
-- Smart Hostel Finder — Remove fabricated demo hostels
-- Language: SQL (PostgreSQL)
--
-- "Pentagon Student Lodge", "Legon Hills Hostel", and "KNUST Green Court"
-- were placeholder DEMO data created before real verified hostel data was
-- required -- they were never researched or confirmed to be real
-- properties. Worse, "Pentagon" collides with the name of an actual
-- ON-CAMPUS University of Ghana hostel that must be excluded per the
-- off-campus-only rule. Their coordinates were guessed, which is why they
-- incorrectly point onto Legon campus grounds rather than a real off-campus
-- private hostel location.
--
-- Rather than inventing "real" coordinates for fictional properties, the
-- correct fix is removal. Deleting a hostel automatically cascades to
-- delete its rooms, bookings, and reviews (existing foreign key rules).
-- =========================================================

DELETE FROM hostels
WHERE name IN ('Pentagon Student Lodge', 'Legon Hills Hostel', 'KNUST Green Court');

-- Verify: should return 0 rows
SELECT id, name FROM hostels
WHERE name IN ('Pentagon Student Lodge', 'Legon Hills Hostel', 'KNUST Green Court');

-- Verify what's left -- should now only be real, researched entries
SELECT name, is_verified, ownership_type, off_campus, source_name FROM hostels ORDER BY name;
