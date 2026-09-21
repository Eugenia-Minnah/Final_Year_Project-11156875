-- =========================================================
-- Smart Hostel Finder — Contact & verification fields for real hostel data
-- Language: SQL (PostgreSQL)
--
-- The existing hostels table had no way to store real contact info or
-- track where verified data came from. This adds exactly that — reusing
-- the existing is_verified boolean as the verification flag rather than
-- adding a duplicate verification_status column.
-- =========================================================

ALTER TABLE hostels ADD COLUMN IF NOT EXISTS phone           VARCHAR(30);
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS whatsapp        VARCHAR(30);
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS email           VARCHAR(150);
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS website         VARCHAR(255);
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS contact_person  VARCHAR(150);
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS ownership_type  VARCHAR(20) DEFAULT 'PRIVATE';
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS off_campus      BOOLEAN DEFAULT TRUE;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS source_url      VARCHAR(500);
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS source_name     VARCHAR(150);
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS verified_at     TIMESTAMP;
