-- =========================================================
-- Smart Hostel Finder — Regions & Universities seed data
-- Language: SQL (PostgreSQL)
-- Run this AFTER regions_universities_schema.sql
--
-- Note: some of Ghana's newer regions (created in 2019 from splits of
-- older regions) do not yet have a major public university headquartered
-- there. Those regions are still included below with no university rows,
-- so your Region dropdown is complete even if the University dropdown
-- is empty for them for now — you can add private/smaller institutions later.
-- =========================================================

-- ---------- 1. All 16 regions ----------
INSERT INTO regions (name) VALUES
('Greater Accra'),
('Ashanti'),
('Central'),
('Eastern'),
('Volta'),
('Western'),
('Western North'),
('Ahafo'),
('Bono'),
('Bono East'),
('Oti'),
('Northern'),
('Savannah'),
('North East'),
('Upper East'),
('Upper West');

-- ---------- 2. Major universities per region ----------

-- Greater Accra
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Greater Accra'), 'University of Ghana', 'UG'),
((SELECT id FROM regions WHERE name = 'Greater Accra'), 'Ghana Institute of Management and Public Administration', 'GIMPA'),
((SELECT id FROM regions WHERE name = 'Greater Accra'), 'University of Professional Studies, Accra', 'UPSA'),
((SELECT id FROM regions WHERE name = 'Greater Accra'), 'Accra Technical University', 'ATU'),
((SELECT id FROM regions WHERE name = 'Greater Accra'), 'Ghana Institute of Journalism', 'GIJ');

-- Ashanti
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Ashanti'), 'Kwame Nkrumah University of Science and Technology', 'KNUST'),
((SELECT id FROM regions WHERE name = 'Ashanti'), 'Kumasi Technical University', 'KsTU'),
((SELECT id FROM regions WHERE name = 'Ashanti'), 'Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development', 'AAMUSTED');

-- Central
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Central'), 'University of Cape Coast', 'UCC'),
((SELECT id FROM regions WHERE name = 'Central'), 'University of Education, Winneba', 'UEW'),
((SELECT id FROM regions WHERE name = 'Central'), 'Cape Coast Technical University', 'CCTU');

-- Eastern
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Eastern'), 'Koforidua Technical University', 'KTU'),
((SELECT id FROM regions WHERE name = 'Eastern'), 'Presbyterian University, Ghana', 'PUG'),
((SELECT id FROM regions WHERE name = 'Eastern'), 'All Nations University', 'ANU');

-- Volta
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Volta'), 'Ho Technical University', 'HTU'),
((SELECT id FROM regions WHERE name = 'Volta'), 'University of Health and Allied Sciences', 'UHAS');

-- Western
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Western'), 'University of Mines and Technology', 'UMaT'),
((SELECT id FROM regions WHERE name = 'Western'), 'Takoradi Technical University', 'TTU');

-- Bono
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Bono'), 'University of Energy and Natural Resources', 'UENR'),
((SELECT id FROM regions WHERE name = 'Bono'), 'Catholic University College of Ghana', 'CUCG');

-- Northern
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Northern'), 'University for Development Studies', 'UDS'),
((SELECT id FROM regions WHERE name = 'Northern'), 'Tamale Technical University', 'TaTU');

-- Upper East
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Upper East'), 'C. K. Tedam University of Technology and Applied Sciences', 'CKT-UTAS'),
((SELECT id FROM regions WHERE name = 'Upper East'), 'Bolgatanga Technical University', 'BTU');

-- Upper West
INSERT INTO universities (region_id, name, abbreviation) VALUES
((SELECT id FROM regions WHERE name = 'Upper West'), 'Simon Diedong Dombo University of Business and Integrated Development Studies', 'SDD-UBIDS');

-- Western North, Ahafo, Bono East, Oti, Savannah, North East:
-- newer regions (created 2019) with no major public university headquartered
-- there yet. Left with regions only so your dropdowns stay complete;
-- add local/private institutions here later if needed, e.g.:
-- INSERT INTO universities (region_id, name, abbreviation) VALUES
-- ((SELECT id FROM regions WHERE name = 'Bono East'), 'Your Local Institution', 'ABBR');

-- ---------- 3. Real, specific campuses for each university ----------
-- Some universities operate from a single physical site (one campus row).
-- Others (UG, UEW, GIMPA, UDS, Presbyterian University) genuinely span
-- several towns/cities, so they get one row per real campus.

-- University of Ghana — 5 real campuses
INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'UG'), 'Legon Campus'),
((SELECT id FROM universities WHERE abbreviation = 'UG'), 'Korle-Bu Campus'),
((SELECT id FROM universities WHERE abbreviation = 'UG'), 'Accra City Campus'),
((SELECT id FROM universities WHERE abbreviation = 'UG'), 'Kumasi City Campus'),
((SELECT id FROM universities WHERE abbreviation = 'UG'), 'Takoradi City Campus');

-- GIMPA — Accra (main), plus regional centres
INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'GIMPA'), 'Achimota Campus'),
((SELECT id FROM universities WHERE abbreviation = 'GIMPA'), 'Kumasi Campus'),
((SELECT id FROM universities WHERE abbreviation = 'GIMPA'), 'Takoradi Campus');

INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'UPSA'), 'UPSA Campus, Accra'),
((SELECT id FROM universities WHERE abbreviation = 'ATU'), 'Accra Campus'),
((SELECT id FROM universities WHERE abbreviation = 'GIJ'), 'Accra Campus');

-- KNUST — one physical campus in Kumasi
INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'KNUST'), 'Kumasi Campus'),
((SELECT id FROM universities WHERE abbreviation = 'KsTU'), 'Kumasi Campus');

-- AAMUSTED — absorbed UEW's former Kumasi and Mampong sites in 2020
INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'AAMUSTED'), 'Kumasi Campus'),
((SELECT id FROM universities WHERE abbreviation = 'AAMUSTED'), 'Mampong Campus');

INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'UCC'), 'Cape Coast Campus'),
((SELECT id FROM universities WHERE abbreviation = 'CCTU'), 'Cape Coast Campus');

-- UEW — Winneba (main) and Ajumako (satellite for Ghanaian Languages)
INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'UEW'), 'Winneba Campus'),
((SELECT id FROM universities WHERE abbreviation = 'UEW'), 'Ajumako Campus');

INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'KTU'), 'Koforidua Campus'),
((SELECT id FROM universities WHERE abbreviation = 'ANU'), 'Koforidua Campus');

-- Presbyterian University, Ghana — spans three towns
INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'PUG'), 'Abetifi Campus'),
((SELECT id FROM universities WHERE abbreviation = 'PUG'), 'Akropong Campus'),
((SELECT id FROM universities WHERE abbreviation = 'PUG'), 'Agogo Campus');

INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'HTU'), 'Ho Campus'),
((SELECT id FROM universities WHERE abbreviation = 'UHAS'), 'Ho Campus'),
((SELECT id FROM universities WHERE abbreviation = 'UMaT'), 'Tarkwa Campus'),
((SELECT id FROM universities WHERE abbreviation = 'TTU'), 'Takoradi Campus'),
((SELECT id FROM universities WHERE abbreviation = 'UENR'), 'Sunyani Campus'),
((SELECT id FROM universities WHERE abbreviation = 'CUCG'), 'Fiapre Campus'),
((SELECT id FROM universities WHERE abbreviation = 'TaTU'), 'Tamale Campus'),
((SELECT id FROM universities WHERE abbreviation = 'CKT-UTAS'), 'Navrongo Campus'),
((SELECT id FROM universities WHERE abbreviation = 'BTU'), 'Bolgatanga Campus'),
((SELECT id FROM universities WHERE abbreviation = 'SDD-UBIDS'), 'Wa Campus');

-- UDS — spans two towns in the north
INSERT INTO campuses (university_id, name) VALUES
((SELECT id FROM universities WHERE abbreviation = 'UDS'), 'Tamale Campus'),
((SELECT id FROM universities WHERE abbreviation = 'UDS'), 'Nyankpala Campus');
