-- =========================================================
-- Smart Hostel Finder — Hostel claim requests
-- Language: SQL (PostgreSQL)
--
-- Lets a real hostel owner request ownership of a listing currently held
-- by the "Hostel Directory (Unclaimed Listings)" placeholder account —
-- the ones added via the verified-research batches. An admin reviews and
-- approves before ownership actually transfers, so a random signup can't
-- just hijack a real business's listing.
-- =========================================================

CREATE TABLE IF NOT EXISTS hostel_claims (
    id              SERIAL PRIMARY KEY,
    hostel_id       INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    requested_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    message         TEXT,
    reviewed_by     INTEGER REFERENCES users(id),
    reviewed_at     TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hostel_claims_hostel ON hostel_claims(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_claims_status ON hostel_claims(status);
