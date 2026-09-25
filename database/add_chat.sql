CREATE TABLE IF NOT EXISTS conversations (
    id          SERIAL PRIMARY KEY,
    hostel_id   INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (hostel_id, student_id)
);
CREATE TABLE IF NOT EXISTS messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body            TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_hostel ON conversations(hostel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
