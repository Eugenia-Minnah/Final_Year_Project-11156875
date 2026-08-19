-- =========================================================
-- Smart Hostel Finder — Database Schema
-- Language: SQL (PostgreSQL)
-- Run this once against your database to create all tables.
-- =========================================================

-- Clean slate (safe to re-run while developing)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS hostels CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------
-- USERS  (students, hostel owners, and admins all live here)
-- ---------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(120)  NOT NULL,
    email           VARCHAR(160)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    role            VARCHAR(20)   NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'owner', 'admin')),
    phone           VARCHAR(30),
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- HOSTELS
-- ---------------------------------------------------------
CREATE TABLE hostels (
    id              SERIAL PRIMARY KEY,
    owner_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    region          VARCHAR(80)  NOT NULL,          -- e.g. Legon, Accra, Kumasi
    address         VARCHAR(255),
    description     TEXT,
    has_cctv        BOOLEAN DEFAULT FALSE,
    has_shuttle     BOOLEAN DEFAULT FALSE,
    nearby_bus_stop VARCHAR(150),
    is_verified     BOOLEAN DEFAULT FALSE,          -- admin approves this
    cover_image_url VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- ROOMS  (each hostel offers several room types)
-- ---------------------------------------------------------
CREATE TABLE rooms (
    id              SERIAL PRIMARY KEY,
    hostel_id       INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_type       VARCHAR(50) NOT NULL,           -- '1 in a room', '2 in a room', '4 in a room'
    price_per_year  NUMERIC(10,2) NOT NULL,         -- GH₵
    total_units     INTEGER NOT NULL DEFAULT 1,
    available_units INTEGER NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------
-- BOOKINGS  (a student reserving a room / paying deposit)
-- ---------------------------------------------------------
CREATE TABLE bookings (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id         INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    deposit_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------
CREATE TABLE reviews (
    id              SERIAL PRIMARY KEY,
    hostel_id       INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    student_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Helpful indexes for search/filtering
CREATE INDEX idx_hostels_region ON hostels(region);
CREATE INDEX idx_rooms_hostel   ON rooms(hostel_id);
CREATE INDEX idx_bookings_student ON bookings(student_id);
