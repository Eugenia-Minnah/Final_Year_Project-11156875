-- =========================================================
-- Smart Hostel Finder — REAL VERIFIED off-campus hostel dataset
-- Language: SQL (PostgreSQL)
--
-- BATCH 1 OF 16: Greater Accra only (University of Ghana/Legon,
-- UPSA/Madina). GIMPA/Achimota returned no verifiable off-campus data
-- in this pass -- see the completeness report for details.
--
-- Run AFTER add_hostel_contact_fields.sql.
-- Safe to re-run: uses WHERE NOT EXISTS on hostel name to avoid duplicates.
-- =========================================================

-- ---------- EXISTING UNIVERSITY/CAMPUS REFERENCES ----------
-- No new universities/campuses/regions created -- every hostel below
-- references the region/city already present in the database. UPSA has
-- no campus row in the current seed data, so its hostels are linked by
-- region/city only (Greater Accra / Madina), not to a specific campus_id.

-- A directory-listing placeholder owner account, since these are real
-- properties sourced from public research, not yet self-registered by
-- their actual management on this platform.
INSERT INTO users (full_name, email, password_hash, role)
VALUES ('Hostel Directory (Unclaimed Listings)', 'directory@smarthostelfinder.local',
        '$2a$10$CwTycUXWue0Thq9StjUM0uJ8G6r5vJHchTMkOo7RS0dK4bqUyrfF6', 'owner')
ON CONFLICT (email) DO NOTHING;

-- ---------- VERIFIED OFF-CAMPUS HOSTELS ----------

-- Aseda Hostel -- North Legon. FULLY VERIFIED: identity, off-campus status,
-- contact number, and coordinates all corroborated by independent sources.
-- Source: near-place.com (coordinates + historical contact),
--         getrooms.co (identity, off-campus student hostel description)
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  latitude, longitude, phone, ownership_type, off_campus,
  source_name, source_url, is_verified, verified_at, has_security_guard
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Aseda Hostel',
  (SELECT id FROM regions WHERE name = 'Greater Accra'),
  'Accra',
  'North Legon, near University of Ghana',
  'Private off-campus student hostel in North Legon, within walking distance of University of Ghana. Not affiliated with or owned by the university.',
  5.671858, -0.1779972,
  '026 921 0716',
  'PRIVATE', TRUE,
  'near-place.com / getrooms.co', 'https://gh.near-place.com/aseda-hostel-',
  TRUE, NOW(), TRUE
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Aseda Hostel');

-- Aseda Hostel Annex A -- North Legon. PARTIALLY VERIFIED: identity and
-- off-campus status confirmed; exact coordinates NOT independently found,
-- so latitude/longitude are left NULL rather than estimated or copied
-- from the main Aseda Hostel property.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  ownership_type, off_campus, source_name, source_url, is_verified
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Aseda Hostel Annex A',
  (SELECT id FROM regions WHERE name = 'Greater Accra'),
  'Accra',
  'North Legon, near University of Ghana',
  'Private off-campus student hostel, twin property affiliated with Aseda Hostel in North Legon. NEEDS_VERIFICATION: exact coordinates not yet confirmed.',
  'PRIVATE', TRUE,
  'getrooms.co / goafricaonline.com', 'https://getrooms.co/hostels/aseda-hostel-annex-accra/',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Aseda Hostel Annex A');

-- Aseda Hostel Annex B -- Ga East Municipal area, near North Legon Hospital.
-- PARTIALLY VERIFIED: identity confirmed; coordinates NOT confirmed.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  phone, ownership_type, off_campus, source_name, source_url, is_verified
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Aseda Hostel Annex B',
  (SELECT id FROM regions WHERE name = 'Greater Accra'),
  'Accra',
  'Near North Legon Hospital, North Legon',
  'Private off-campus student hostel affiliated with Aseda Hostel. NEEDS_VERIFICATION: exact coordinates not yet confirmed.',
  '020 435 5855',
  'PRIVATE', TRUE,
  'mapcarta.com', 'https://mapcarta.com/W696489877',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Aseda Hostel Annex B');

-- Heaven's Gate Hostel -- East Legon Extension, near UPSA. VERIFIED
-- identity/contact (phone independently corroborated by two sources);
-- coordinates NOT confirmed to the specific property.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  phone, ownership_type, off_campus, source_name, source_url, is_verified
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Heaven''s Gate Hostel',
  (SELECT id FROM regions WHERE name = 'Greater Accra'),
  'Accra',
  'East Legon Extension, near UPSA',
  'Private off-campus student hostel roughly 500m from University of Professional Studies, Accra (UPSA). Not affiliated with or owned by the university. NEEDS_VERIFICATION: exact coordinates not yet confirmed.',
  '024 424 1720',
  'PRIVATE', TRUE,
  'near-place.com / heavensgatehostel.com', 'https://heavensgatehostel.com/',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Heaven''s Gate Hostel');

-- Green Hostel -- Madina, near UPSA. Sourced directly from UPSA's OWN
-- official student-services page listing off-campus options -- a highly
-- reliable source. Coordinates NOT confirmed.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  phone, ownership_type, off_campus, source_name, source_url, is_verified
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Green Hostel',
  (SELECT id FROM regions WHERE name = 'Greater Accra'),
  'Madina',
  'Madina, near UPSA',
  'Private off-campus student hostel near University of Professional Studies, Accra (UPSA), listed by UPSA''s own student services page. NEEDS_VERIFICATION: exact coordinates not yet confirmed.',
  '0244039363',
  'PRIVATE', TRUE,
  'UPSA official website (upsa.edu.gh)', 'https://upsa.edu.gh/students/student-services/',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Green Hostel');

-- Stream Street Hostel -- Madina, near UPSA. Same official source as above.
INSERT INTO hostels (
  owner_id, name, region_id, city, address, description,
  phone, ownership_type, off_campus, source_name, source_url, is_verified
)
SELECT
  (SELECT id FROM users WHERE email = 'directory@smarthostelfinder.local'),
  'Stream Street Hostel',
  (SELECT id FROM regions WHERE name = 'Greater Accra'),
  'Madina',
  'Madina, near UPSA',
  'Private off-campus student hostel near University of Professional Studies, Accra (UPSA), listed by UPSA''s own student services page. NEEDS_VERIFICATION: exact coordinates not yet confirmed.',
  '0266150699',
  'PRIVATE', TRUE,
  'UPSA official website (upsa.edu.gh)', 'https://upsa.edu.gh/students/student-services/',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM hostels WHERE name = 'Stream Street Hostel');

-- ---------- DEMO STUDENT/TENANT ACCOUNTS ----------
-- Clearly fictional demo accounts for testing, spanning different
-- universities already in the database. Password for all: "password123".

INSERT INTO users (full_name, email, password_hash, role, home_campus_id)
SELECT 'Ama Mensah', 'ama.mensah@example.com',
       '$2a$10$CwTycUXWue0Thq9StjUM0uJ8G6r5vJHchTMkOo7RS0dK4bqUyrfF6', 'student',
       (SELECT id FROM campuses WHERE name = 'Legon Campus' AND university_id = (SELECT id FROM universities WHERE abbreviation = 'UG'))
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ama.mensah@example.com');

INSERT INTO users (full_name, email, password_hash, role)
SELECT 'Kwame Boateng', 'kwame.boateng@example.com',
       '$2a$10$CwTycUXWue0Thq9StjUM0uJ8G6r5vJHchTMkOo7RS0dK4bqUyrfF6', 'student'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'kwame.boateng@example.com');
-- Note: Kwame's home campus would be UPSA's campus, but no UPSA campus
-- row exists in the current campuses table -- left NULL rather than
-- guessing a campus_id.

INSERT INTO users (full_name, email, password_hash, role)
SELECT 'Esi Owusu', 'esi.owusu@example.com',
       '$2a$10$CwTycUXWue0Thq9StjUM0uJ8G6r5vJHchTMkOo7RS0dK4bqUyrfF6', 'student'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'esi.owusu@example.com');

INSERT INTO users (full_name, email, password_hash, role, home_campus_id)
SELECT 'Yaw Asante', 'yaw.asante@example.com',
       '$2a$10$CwTycUXWue0Thq9StjUM0uJ8G6r5vJHchTMkOo7RS0dK4bqUyrfF6', 'student',
       (SELECT id FROM campuses WHERE name = 'Kumasi Campus' AND university_id = (SELECT id FROM universities WHERE abbreviation = 'KNUST'))
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'yaw.asante@example.com');

INSERT INTO users (full_name, email, password_hash, role, home_campus_id)
SELECT 'Akosua Owusu', 'akosua.owusu@example.com',
       '$2a$10$CwTycUXWue0Thq9StjUM0uJ8G6r5vJHchTMkOo7RS0dK4bqUyrfF6', 'student',
       (SELECT id FROM campuses WHERE name = 'Cape Coast Campus' AND university_id = (SELECT id FROM universities WHERE abbreviation = 'UCC'))
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'akosua.owusu@example.com');

-- ---------- VERIFICATION SUMMARY (full report in chat response) ----------
-- Verified with coordinates: 1 (Aseda Hostel)
-- Verified identity/contact, coordinates pending: 5
-- Excluded (on-campus/university-owned, per explicit exclusion list): 0 inserted
-- Insufficient data this batch: GIMPA/Achimota off-campus hostels
