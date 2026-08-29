-- =========================================================
-- Smart Hostel Finder — Remove hostel with unverifiable location
-- Language: SQL (PostgreSQL)
--
-- Stream Street Hostel's real, exact coordinates could not be found
-- through research, and estimating/guessing them would be exactly the
-- kind of fabrication this dataset is meant to avoid. Per the decision to
-- only include hostels where a real distance can be calculated, it's
-- removed rather than left with no location. Its rooms/bookings/reviews
-- (none currently exist) would cascade-delete automatically.
-- =========================================================

DELETE FROM hostels WHERE name = 'Stream Street Hostel';

-- Verify: should return 0 rows
SELECT id, name FROM hostels WHERE name = 'Stream Street Hostel';

-- Confirm what's left — every remaining hostel should have coordinates
SELECT name, latitude, longitude FROM hostels ORDER BY name;
