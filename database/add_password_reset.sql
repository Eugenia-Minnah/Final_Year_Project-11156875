-- =========================================================
-- Smart Hostel Finder — Add password reset support
-- Language: SQL (PostgreSQL)
-- =========================================================

ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;
