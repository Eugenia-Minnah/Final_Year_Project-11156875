-- =========================================================
-- Smart Hostel Finder — Payment tracking for bookings
-- Language: SQL (PostgreSQL)
--
-- Kept separate from the existing "status" column (booking lifecycle:
-- pending/confirmed/cancelled) — payment_status tracks the DEPOSIT
-- payment specifically, since a booking can exist before payment
-- completes. Purely additive, nothing existing is changed.
-- =========================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
