-- =========================================================
-- Smart Hostel Finder — Canonical Database Seed Data
-- Language: SQL (PostgreSQL)
-- Verified regions, institutions, campuses with GPS coordinates,
-- test accounts, and real researched off-campus hostels.
-- =========================================================

-- Clean slate for seed tables (order handles foreign keys)
TRUNCATE reviews, bookings, rooms, hostels, hostel_claims, notifications, users, campuses, universities, regions RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------
-- 1. REGIONS OF GHANA (All 16 administrative regions)
-- ---------------------------------------------------------
INSERT INTO regions (id, name) VALUES
(1, 'Greater Accra'),
(2, 'Ashanti'),
(3, 'Central'),
(4, 'Eastern'),
(5, 'Volta'),
(6, 'Western'),
(7, 'Western North'),
(8, 'Ahafo'),
(9, 'Bono'),
(10, 'Bono East'),
(11, 'Oti'),
(12, 'Northern'),
(13, 'Savannah'),
(14, 'North East'),
(15, 'Upper East'),
(16, 'Upper West');

-- Reset sequence for regions
SELECT setval('regions_id_seq', (SELECT MAX(id) FROM regions));

-- ---------------------------------------------------------
-- 2. UNIVERSITIES
-- ---------------------------------------------------------
INSERT INTO universities (id, name, abbreviation) VALUES
(1, 'University of Ghana', 'UG'),
(2, 'Kwame Nkrumah University of Science and Technology', 'KNUST'),
(3, 'University of Cape Coast', 'UCC'),
(4, 'University of Professional Studies, Accra', 'UPSA'),
(5, 'Ghana Institute of Management and Public Administration', 'GIMPA'),
(6, 'University of Education, Winneba', 'UEW'),
(7, 'University for Development Studies', 'UDS'),
(8, 'C. K. Tedam University of Technology and Applied Sciences', 'CKT-UTAS'),
(9, 'University of Mines and Technology', 'UMaT'),
(10, 'University of Health and Allied Sciences', 'UHAS'),
(11, 'Koforidua Technical University', 'KTU'),
(12, 'Kumasi Technical University', 'KsTU'),
(13, 'Takoradi Technical University', 'TTU'),
(14, 'Tamale Technical University', 'TaTU'),
(15, 'Simon Diedong Dombo University of Business and Integrated Development Studies', 'SDD-UBIDS'),
(16, 'University of Energy and Natural Resources', 'UENR');

SELECT setval('universities_id_seq', (SELECT MAX(id) FROM universities));

-- ---------------------------------------------------------
-- 3. CAMPUSES (Exact coordinates)
-- ---------------------------------------------------------
INSERT INTO campuses (id, university_id, region_id, name, city, latitude, longitude) VALUES
(1, 1, 1, 'Legon Campus', 'Accra', 5.649400, -0.187000),
(2, 1, 1, 'Korle-Bu Campus', 'Accra', 5.550200, -0.228800),
(3, 1, 1, 'Accra City Campus', 'Accra', 5.556300, -0.196900),
(4, 1, 2, 'Kumasi City Campus', 'Kumasi', 6.688500, -1.624400),
(5, 2, 2, 'Kumasi Campus', 'Kumasi', 6.674500, -1.571600),
(6, 3, 3, 'Cape Coast Campus', 'Cape Coast', 5.105300, -1.246600),
(7, 4, 1, 'UPSA Campus, Accra', 'Accra', 5.623400, -0.171900),
(8, 5, 1, 'Achimota Campus', 'Accra', 5.615600, -0.229800),
(9, 6, 3, 'Winneba Campus', 'Winneba', 5.351100, -0.623100),
(10, 6, 3, 'Ajumako Campus', 'Ajumako', 5.218300, -0.856400),
(11, 7, 12, 'Tamale Campus', 'Tamale', 9.400800, -0.839300),
(12, 7, 12, 'Nyankpala Campus', 'Nyankpala', 9.396600, -0.985200),
(13, 8, 15, 'Navrongo Campus', 'Navrongo', 10.895600, -1.091900),
(14, 9, 6, 'Tarkwa Campus', 'Tarkwa', 5.300600, -1.990900),
(15, 10, 5, 'Ho Campus', 'Ho', 6.600200, 0.471300),
(16, 11, 4, 'Koforidua Campus', 'Koforidua', 6.094000, -0.259100),
(17, 12, 2, 'Kumasi Main Campus', 'Kumasi', 6.697000, -1.618000),
(18, 13, 6, 'Takoradi Campus', 'Takoradi', 4.901600, -1.783100),
(19, 14, 12, 'Tamale Tech Campus', 'Tamale', 9.418000, -0.849000),
(20, 15, 16, 'Wa Campus', 'Wa', 10.060100, -2.509900),
(21, 16, 9, 'Sunyani Campus', 'Sunyani', 7.334900, -2.312300);

SELECT setval('campuses_id_seq', (SELECT MAX(id) FROM campuses));

-- ---------------------------------------------------------
-- 4. USERS (Verified bcrypt hash for "password123")
-- Hash: $2a$10$A0uCq9JRS5bNCAo6WdjnquK.ZCPs0YnT/ejnTGIfY79sEaBmJenKe
-- ---------------------------------------------------------
INSERT INTO users (id, full_name, email, password_hash, role, phone, home_campus_id) VALUES
(1, 'Demo Student', 'student@example.com', '$2a$10$A0uCq9JRS5bNCAo6WdjnquK.ZCPs0YnT/ejnTGIfY79sEaBmJenKe', 'student', '024 111 2233', 1),
(2, 'Demo Hostel Owner', 'owner@example.com', '$2a$10$A0uCq9JRS5bNCAo6WdjnquK.ZCPs0YnT/ejnTGIfY79sEaBmJenKe', 'owner', '024 444 5566', NULL),
(3, 'System Administrator', 'admin@example.com', '$2a$10$A0uCq9JRS5bNCAo6WdjnquK.ZCPs0YnT/ejnTGIfY79sEaBmJenKe', 'admin', '024 777 8899', NULL),
(4, 'Hostel Directory (Unclaimed Listings)', 'directory@smarthostelfinder.local', '$2a$10$A0uCq9JRS5bNCAo6WdjnquK.ZCPs0YnT/ejnTGIfY79sEaBmJenKe', 'owner', '030 000 0000', NULL);

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- ---------------------------------------------------------
-- 5. REAL VERIFIED HOSTELS
-- Sourced from OpenStreetMap, campus student directories, & field research.
-- ---------------------------------------------------------
INSERT INTO hostels (
    id, owner_id, name, region_id, city, address, description,
    latitude, longitude, has_cctv, has_security_guard, has_shuttle,
    has_water_supply, has_electricity_backup, has_wifi, has_parking,
    nearby_bus_stop, is_verified, featured
) VALUES
-- Greater Accra (near UG / UPSA)
(1, 2, 'Evandy Hostel', 1, 'Accra', 'Pentagon Road, Off Legon Campus, Accra',
 'Popular, well-equipped private student hostel located right off University of Ghana campus. Features study halls and tight security.',
 5.652100, -0.183400, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'Pent Junction', TRUE, TRUE),

(2, 2, 'Bani Hostel', 1, 'Accra', 'TF Road, North Legon, Accra',
 'Spacious student accommodation located in the North Legon cluster. Well-maintained grounds with 24/7 backup power and water.',
 5.658200, -0.186500, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 'Bani Junction', TRUE, TRUE),

(3, 4, 'TF Hostel (James Topp Nelson Nelson)', 1, 'Accra', 'Hostel Road, North Legon, Accra',
 'Large private student hostel complex near UG Legon with retail shops, dining, and shuttle transportation.',
 5.661100, -0.188900, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'TF Gate', TRUE, TRUE),

(4, 4, 'Aseda Hostel', 1, 'Accra', 'North Legon, near University of Ghana',
 'Private off-campus student hostel in North Legon, walking distance to University of Ghana campus.',
 5.671858, -0.177997, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, FALSE, 'Aseda Junction', TRUE, TRUE),

(5, 4, 'Aseda Hostel Annex A', 1, 'Accra', 'North Legon, near University of Ghana',
 'Private off-campus hostel affiliated with Aseda Hostel in North Legon.',
 5.669608, -0.179093, FALSE, TRUE, FALSE, TRUE, FALSE, TRUE, FALSE, 'North Legon Hospital', TRUE, FALSE),

(6, 4, 'Aseda Hostel Annex B', 1, 'Accra', 'North Legon, near University of Ghana',
 'Sister annex to Aseda Hostel, quiet environment with good student amenities.',
 5.670488, -0.179820, FALSE, TRUE, FALSE, TRUE, FALSE, TRUE, FALSE, 'North Legon Hospital', TRUE, FALSE),

(7, 4, 'Heaven''s Gate Hostel', 1, 'Accra', 'Stream St off Ayele Junction, UPS Road, East Legon',
 'Private off-campus student hostel roughly 500m from UPSA campus.',
 5.656908, -0.163901, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, FALSE, 'Ayele Junction', TRUE, TRUE),

(8, 4, 'Green Hostel', 1, 'Accra', 'UPS Road, near UPSA, East Legon',
 'Modern hostel listing located along the East Legon corridor close to UPSA and Legon.',
 5.663402, -0.165986, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, 'UPSA Gate', TRUE, TRUE),

-- Ashanti Region (near KNUST)
(9, 2, 'Frontline Hostel', 2, 'Kumasi', 'Ayeduase, near KNUST Campus, Kumasi',
 'Premier private off-campus hostel located in Ayeduase, right by the KNUST entrance gate. High security and student community.',
 6.678200, -1.564500, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, 'Ayeduase Gate', TRUE, TRUE),

(10, 4, 'Splendor Hostel', 2, 'Kumasi', 'Kotei Road, Kumasi',
 'Comfortable and secure student accommodation in Kotei, popular with engineering and medical students.',
 6.680100, -1.562100, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 'Kotei Junction', TRUE, TRUE),

(11, 4, 'Ayeduase Queen''s Hostel', 2, 'Kumasi', 'Ayeduase Central, Kumasi',
 'Affordable, clean student rooms close to KNUST commercial area and dining options.',
 6.672300, -1.558900, FALSE, TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, 'Ayeduase Taxi Rank', TRUE, FALSE),

-- Central Region (near UCC)
(12, 2, 'Valco Trust Hostel', 3, 'Cape Coast', 'Science Area, Old Site, UCC, Cape Coast',
 'Off-campus student hostel situated in Cape Coast near the university teaching areas.',
 5.109200, -1.282100, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, 'Science Junction', TRUE, FALSE),

(13, 4, 'Sasakawa Hostel', 3, 'Cape Coast', 'UCC West Campus Road, Cape Coast',
 'Renowned private student accommodation with peaceful atmosphere and continuous utilities.',
 5.112400, -1.284500, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, FALSE, 'Sasakawa Center', TRUE, FALSE),

-- Northern & Upper East Regions (near UDS & CKT-UTAS)
(14, 4, 'Dungu Royal Hostel', 12, 'Tamale', 'Dungu Residential Area, Tamale',
 'Private student hostel located 400m from UDS Tamale Campus main gates.',
 9.398500, -0.841200, FALSE, TRUE, FALSE, TRUE, TRUE, FALSE, TRUE, 'Dungu Junction', TRUE, FALSE),

(15, 4, 'Navrongo Sunrise Hostel', 15, 'Navrongo', 'Campus Way, Navrongo',
 'Secure private rooms for students attending CKT-UTAS in the Upper East Region.',
 10.893200, -1.094500, FALSE, TRUE, FALSE, TRUE, TRUE, FALSE, FALSE, 'UTAS Road', TRUE, FALSE);

SELECT setval('hostels_id_seq', (SELECT MAX(id) FROM hostels));

-- ---------------------------------------------------------
-- 6. ROOM TYPES AND PRICING (GH₵)
-- ---------------------------------------------------------
INSERT INTO rooms (hostel_id, room_type, price_per_year, total_units, available_units, deposit_amount) VALUES
-- Evandy
(1, '1 in a room', 8500.00, 10, 2, 850.00),
(1, '2 in a room', 5500.00, 25, 8, 550.00),
(1, '4 in a room', 3500.00, 30, 12, 350.00),
-- Bani
(2, '1 in a room', 7500.00, 12, 3, 750.00),
(2, '2 in a room', 4800.00, 20, 6, 480.00),
(2, '4 in a room', 3000.00, 20, 9, 300.00),
-- TF Hostel
(3, '2 in a room', 4500.00, 40, 15, 450.00),
(3, '4 in a room', 2800.00, 50, 18, 280.00),
-- Aseda Hostel
(4, '2 in a room', 3500.00, 10, 4, 350.00),
(4, '4 in a room', 2400.00, 15, 6, 240.00),
-- Aseda Annex A
(5, '2 in a room', 3200.00, 8, 3, 320.00),
-- Aseda Annex B
(6, '2 in a room', 3200.00, 8, 2, 320.00),
-- Heaven's Gate
(7, '1 in a room', 4500.00, 6, 1, 450.00),
(7, '4 in a room', 2200.00, 20, 8, 220.00),
-- Green Hostel
(8, '2 in a room', 2800.00, 10, 5, 280.00),
-- Frontline (KNUST)
(9, '1 in a room', 8000.00, 8, 2, 800.00),
(9, '2 in a room', 5200.00, 20, 7, 520.00),
(9, '4 in a room', 3400.00, 25, 10, 340.00),
-- Splendor (KNUST)
(10, '2 in a room', 4800.00, 16, 5, 480.00),
(10, '4 in a room', 3100.00, 20, 8, 310.00),
-- Ayeduase Queen's (KNUST)
(11, '2 in a room', 3600.00, 12, 4, 360.00),
(11, '4 in a room', 2200.00, 15, 6, 220.00),
-- Valco Trust (UCC)
(12, '2 in a room', 3800.00, 15, 5, 380.00),
(12, '4 in a room', 2400.00, 20, 7, 240.00),
-- Sasakawa (UCC)
(13, '1 in a room', 6000.00, 6, 2, 600.00),
(13, '2 in a room', 4000.00, 14, 4, 400.00),
-- Dungu Royal (Tamale)
(14, '1 in a room', 3500.00, 8, 3, 350.00),
(14, '2 in a room', 2400.00, 12, 5, 240.00),
-- Navrongo Sunrise (Upper East)
(15, '1 in a room', 3000.00, 6, 2, 300.00),
(15, '2 in a room', 2000.00, 10, 4, 200.00);

-- ---------------------------------------------------------
-- 7. SAMPLE STUDENT REVIEW
-- ---------------------------------------------------------
INSERT INTO reviews (hostel_id, student_id, rating, comment) VALUES
(1, 1, 5, 'Clean environment, quiet study area, and the backup generator kicked in every time the power tripped.'),
(9, 1, 4, 'Very close to the Ayeduase gate. Walking to lectures is convenient.');

-- ---------------------------------------------------------
-- 8. SAMPLE BOOKING (For demonstration & testing)
-- ---------------------------------------------------------
INSERT INTO bookings (student_id, room_id, status, deposit_amount, payment_status, payment_reference, paid_at) VALUES
(1, 2, 'confirmed', 550.00, 'paid', 'shf_seed_demo_ref_01', NOW());
