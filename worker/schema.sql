-- Per-user reading usage. One row per Clerk user.
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,              -- Clerk user id (token "sub")
  email           TEXT,                          -- primary email, for your records
  free_used       INTEGER NOT NULL DEFAULT 0,    -- free readings consumed
  paid_credits    INTEGER NOT NULL DEFAULT 0,    -- purchased readings remaining
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_reading_at TEXT
);

-- Saved readings. One row per generated reading, so a signed-in person can come
-- back and re-read past charts. Auto-saved by the Worker once a reading finishes.
CREATE TABLE IF NOT EXISTS readings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,                       -- Clerk user id (token "sub")
  label      TEXT,                                -- short birth summary, for the list
  chart      TEXT NOT NULL,                       -- the chart text that was read
  reading    TEXT NOT NULL,                       -- the generated reading
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS readings_user_idx ON readings (user_id, created_at DESC, id DESC);
