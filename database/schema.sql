-- =========================================================
-- Smart Hostel Finder — Canonical Database Schema
-- Language: SQL (PostgreSQL)
-- Fully normalized, production-grade schema for Final Year Project.
-- =========================================================

-- Drop existing tables in reverse dependency order (safe for fresh setup)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS hostel_claims CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS hostels CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS campuses CASCADE;
DROP TABLE IF EXISTS universities CASCADE;
DROP TABLE IF EXISTS regions CASCADE;

-- ---------------------------------------------------------
-- REGIONS (Ghana administrative regions)
-- ---------------------------------------------------------
CREATE TABLE regions (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- UNIVERSITIES (Public and private accredited institutions)
-- ---------------------------------------------------------
CREATE TABLE universities (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(180) NOT NULL UNIQUE,
    abbreviation  VARCHAR(30),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- CAMPUSES (Each campus has exact GPS coordinates & belongs to a region)
-- ---------------------------------------------------------
CREATE TABLE campuses (
    id             SERIAL PRIMARY KEY,
    university_id  INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    region_id      INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    name           VARCHAR(150) NOT NULL,
    city           VARCHAR(100),
    latitude       NUMERIC(10, 7) NOT NULL,
    longitude      NUMERIC(10, 7) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- USERS (Students, hostel owners, and system administrators)
-- ---------------------------------------------------------
CREATE TABLE users (
    id                  SERIAL PRIMARY KEY,
    full_name           VARCHAR(120) NOT NULL,
    email               VARCHAR(160) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(20)  NOT NULL DEFAULT 'student'
                        CHECK (role IN ('student', 'owner', 'admin')),
    phone               VARCHAR(30),
    home_campus_id      INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
    reset_token         VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- HOSTELS (Physical private off-campus accommodation)
-- ---------------------------------------------------------
CREATE TABLE hostels (
    id                     SERIAL PRIMARY KEY,
    owner_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                   VARCHAR(150) NOT NULL,
    region_id              INTEGER REFERENCES regions(id) ON DELETE SET NULL,
    city                   VARCHAR(100),
    address                VARCHAR(255),
    description            TEXT,
    latitude               NUMERIC(10, 7),
    longitude              NUMERIC(10, 7),
    has_cctv               BOOLEAN DEFAULT FALSE,
    has_security_guard     BOOLEAN DEFAULT FALSE,
    has_shuttle            BOOLEAN DEFAULT FALSE,
    has_water_supply       BOOLEAN DEFAULT TRUE,
    has_electricity_backup BOOLEAN DEFAULT FALSE,
    has_wifi               BOOLEAN DEFAULT FALSE,
    has_parking            BOOLEAN DEFAULT FALSE,
    nearby_bus_stop        VARCHAR(150),
    is_verified            BOOLEAN DEFAULT FALSE,
    featured               BOOLEAN DEFAULT FALSE,
    cover_image_url        VARCHAR(500),
    created_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- ROOMS (Room tiers / options offered by each hostel)
-- ---------------------------------------------------------
CREATE TABLE rooms (
    id              SERIAL PRIMARY KEY,
    hostel_id       INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_type       VARCHAR(50) NOT NULL,
    price_per_year  NUMERIC(10, 2) NOT NULL,
    total_units     INTEGER NOT NULL DEFAULT 1,
    available_units INTEGER NOT NULL DEFAULT 1,
    deposit_amount  NUMERIC(10, 2)
);

-- ---------------------------------------------------------
-- BOOKINGS (Student room reservations & deposit payments)
-- Note: ON DELETE RESTRICT on room_id prevents accidental cascade
-- deletion of bookings when room configurations are edited.
-- ---------------------------------------------------------
CREATE TABLE bookings (
    id                SERIAL PRIMARY KEY,
    student_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id           INTEGER NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    deposit_amount    NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_status    VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                      CHECK (payment_status IN ('unpaid', 'paid', 'failed')),
    payment_reference VARCHAR(100),
    paid_at           TIMESTAMP,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- REVIEWS (Ratings and feedback left by students)
-- ---------------------------------------------------------
CREATE TABLE reviews (
    id          SERIAL PRIMARY KEY,
    hostel_id   INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_hostel_student_review UNIQUE (hostel_id, student_id)
);

-- ---------------------------------------------------------
-- HOSTEL CLAIMS (Owners claiming public directory listings)
-- ---------------------------------------------------------
CREATE TABLE hostel_claims (
    id            SERIAL PRIMARY KEY,
    hostel_id     INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    requested_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
    message       TEXT,
    reviewed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at   TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- NOTIFICATIONS (In-app notifications for users)
-- ---------------------------------------------------------
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    link        VARCHAR(255),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- PERFORMANCE INDEXES
-- ---------------------------------------------------------
CREATE INDEX idx_hostels_region_id ON hostels(region_id);
CREATE INDEX idx_hostels_owner_id ON hostels(owner_id);
CREATE INDEX idx_hostels_coords ON hostels(latitude, longitude);
CREATE INDEX idx_campuses_uni_reg ON campuses(university_id, region_id);
CREATE INDEX idx_rooms_hostel_id ON rooms(hostel_id);
CREATE INDEX idx_bookings_student_id ON bookings(student_id);
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_payment_ref ON bookings(payment_reference);
CREATE INDEX idx_reviews_hostel_id ON reviews(hostel_id);
CREATE INDEX idx_hostel_claims_hostel ON hostel_claims(hostel_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
