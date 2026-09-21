-- =========================================================
-- Smart Hostel Finder — Region / University / Campus hierarchy
-- Language: SQL (PostgreSQL)
--
-- This adds the structure: Region -> University -> Campus -> Hostel
-- Run this AFTER schema.sql (it references hostels, so schema.sql must exist first).
-- =========================================================

-- ---------------------------------------------------------
-- REGIONS  (Ghana's 16 administrative regions)
-- ---------------------------------------------------------
CREATE TABLE regions (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(60) NOT NULL UNIQUE
);

-- ---------------------------------------------------------
-- UNIVERSITIES  (belongs to a region)
-- ---------------------------------------------------------
CREATE TABLE universities (
    id          SERIAL PRIMARY KEY,
    region_id   INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    abbreviation VARCHAR(20)
);

-- ---------------------------------------------------------
-- CAMPUSES  (belongs to a university — some have only one)
-- ---------------------------------------------------------
CREATE TABLE campuses (
    id              SERIAL PRIMARY KEY,
    university_id   INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL   -- e.g. 'Main Campus', 'City Campus'
);

-- ---------------------------------------------------------
-- Link hostels to a campus instead of a free-text region.
-- We ADD the new column but keep the old "region" text column for now,
-- so nothing breaks while you migrate your existing hostel rows.
-- ---------------------------------------------------------
ALTER TABLE hostels ADD COLUMN campus_id INTEGER REFERENCES campuses(id);

CREATE INDEX idx_universities_region ON universities(region_id);
CREATE INDEX idx_campuses_university ON campuses(university_id);
CREATE INDEX idx_hostels_campus ON hostels(campus_id);
