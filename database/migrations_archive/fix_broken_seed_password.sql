-- =========================================================
-- Smart Hostel Finder — Fix broken seeded password hash
-- Language: SQL (PostgreSQL)
--
-- The password hash originally used across all seed data
-- ('$2a$10$CwTycUXWue0Thq9StjUM0uJ8G6r5vJHchTMkOo7RS0dK4bqUyrfF6') was
-- NEVER ACTUALLY VERIFIED and does not correspond to "password123" — this
-- has been broken since the very first seed file. This migration replaces
-- it with a genuinely correct, freshly-generated hash for "password123"
-- on every account that used it.
--
-- Verified correct via: bcrypt.compareSync('password123', hash) === true
-- =========================================================

UPDATE users
SET password_hash = '$2a$10$A0uCq9JRS5bNCAo6WdjnquK.ZCPs0YnT/ejnTGIfY79sEaBmJenKe'
WHERE password_hash = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8G6r5vJHchTMkOo7RS0dK4bqUyrfF6';

-- Verify: lists every account whose password is now fixed
SELECT email, role FROM users
WHERE password_hash = '$2a$10$A0uCq9JRS5bNCAo6WdjnquK.ZCPs0YnT/ejnTGIfY79sEaBmJenKe'
ORDER BY role, email;
