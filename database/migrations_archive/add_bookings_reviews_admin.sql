-- =========================================================
-- Smart Hostel Finder — Bookings, reviews, and admin support
-- Language: SQL (PostgreSQL)
-- =========================================================

-- A student can only leave ONE review per hostel (resubmitting updates it,
-- rather than piling up duplicate reviews from the same person).
ALTER TABLE reviews ADD CONSTRAINT reviews_hostel_student_unique UNIQUE (hostel_id, student_id);

-- Seed an admin account so you can test the verification workflow.
-- Password is "password123" (same seeded hash used for the other test accounts).
INSERT INTO users (full_name, email, password_hash, role)
VALUES ('Admin', 'admin@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8G6r5vJHchTMkOo7RS0dK4bqUyrfF6', 'admin')
ON CONFLICT (email) DO NOTHING;
