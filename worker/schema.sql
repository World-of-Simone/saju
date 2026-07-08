-- Per-user reading usage. One row per Clerk user.
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,              -- Clerk user id (token "sub")
  email           TEXT,                          -- primary email, for your records
  free_used       INTEGER NOT NULL DEFAULT 0,    -- free readings consumed
  paid_credits    INTEGER NOT NULL DEFAULT 0,    -- purchased readings remaining
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_reading_at TEXT
);
