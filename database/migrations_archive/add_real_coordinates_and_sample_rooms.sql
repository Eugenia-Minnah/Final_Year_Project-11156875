-- =========================================================
-- Smart Hostel Finder — Real coordinates + sample room data
-- Language: SQL (PostgreSQL)
--
-- Coordinates below come from OpenStreetMap (via mapcarta.com) and
-- near-place.com, cross-checked where possible against the phone numbers
-- already on file. Stream Street Hostel is NOT included here — no
-- independently verifiable coordinates were found for it, so it stays
-- unset rather than guessed.
--
-- Room prices/deposits are SAMPLE/INDICATIVE data, not confirmed current
-- prices from any hostel — flagged as such directly in each hostel's
-- description, consistent with "don't present invented prices as real."
-- =========================================================

-- ---------- Real coordinates ----------

UPDATE hostels
SET latitude = 5.669608, longitude = -0.179093,
    description = 'Private off-campus student hostel, twin property affiliated with Aseda Hostel in North Legon. Location confirmed via OpenStreetMap.'
WHERE name = 'Aseda Hostel Annex A';

UPDATE hostels
SET latitude = 5.670488, longitude = -0.17982,
    description = 'Private off-campus student hostel affiliated with Aseda Hostel, near North Legon Hospital. Location confirmed via OpenStreetMap.'
WHERE name = 'Aseda Hostel Annex B';

UPDATE hostels
SET latitude = 5.6569083, longitude = -0.1639007,
    description = 'Private off-campus student hostel roughly 500m from University of Professional Studies, Accra (UPSA), on Stream St off Ayele Junction, UPS Road, East Legon. Not affiliated with or owned by the university. Location and phone number cross-verified via near-place.com.'
WHERE name = 'Heaven''s Gate Hostel';

UPDATE hostels
SET latitude = 5.6634019, longitude = -0.1659858,
    description = 'Private off-campus student hostel near University of Professional Studies, Accra (UPSA), listed by UPSA''s own student services page. Location confirmed via near-place.com.'
WHERE name = 'Green Hostel';

-- ---------- Sample/indicative room data ----------
-- Flag every affected hostel's description so it's clear on the page that
-- pricing below is indicative, not a confirmed current rate.

UPDATE hostels SET description = description || ' (Room pricing shown below is indicative/sample — contact the hostel directly to confirm current rates.)'
WHERE name IN ('Aseda Hostel', 'Aseda Hostel Annex A', 'Aseda Hostel Annex B', 'Heaven''s Gate Hostel', 'Green Hostel', 'Stream Street Hostel');

INSERT INTO rooms (hostel_id, room_type, price_per_year, total_units, available_units, deposit_amount)
SELECT id, '2 in a room', 3500.00, 10, 4, 350.00 FROM hostels WHERE name = 'Aseda Hostel'
UNION ALL
SELECT id, '4 in a room', 2400.00, 15, 6, 240.00 FROM hostels WHERE name = 'Aseda Hostel'
UNION ALL
SELECT id, '2 in a room', 3200.00, 8, 3, 320.00 FROM hostels WHERE name = 'Aseda Hostel Annex A'
UNION ALL
SELECT id, '2 in a room', 3200.00, 8, 2, 320.00 FROM hostels WHERE name = 'Aseda Hostel Annex B'
UNION ALL
SELECT id, '1 in a room', 4500.00, 6, 1, 450.00 FROM hostels WHERE name = 'Heaven''s Gate Hostel'
UNION ALL
SELECT id, '4 in a room', 2200.00, 20, 8, 220.00 FROM hostels WHERE name = 'Heaven''s Gate Hostel'
UNION ALL
SELECT id, '2 in a room', 2800.00, 10, 5, 280.00 FROM hostels WHERE name = 'Green Hostel'
UNION ALL
SELECT id, '4 in a room', 2000.00, 12, 4, 200.00 FROM hostels WHERE name = 'Stream Street Hostel';

-- Verify
SELECT h.name, h.latitude, h.longitude, COUNT(r.id) AS room_count
FROM hostels h LEFT JOIN rooms r ON r.hostel_id = h.id
GROUP BY h.id ORDER BY h.name;
