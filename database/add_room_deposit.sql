-- =========================================================
-- Smart Hostel Finder — Owner-configurable deposit per room type
-- Language: SQL (PostgreSQL)
-- NULL means "not set" — the system falls back to 10% of the room's
-- yearly price only when an owner hasn't specified their own amount.
-- =========================================================

ALTER TABLE rooms ADD COLUMN deposit_amount NUMERIC(10,2);
