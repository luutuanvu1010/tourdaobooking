-- Module: staff
CREATE TABLE staff (
  id         TEXT PRIMARY KEY,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL UNIQUE,
  pin_hash   TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('sales', 'admin')),
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL
);
