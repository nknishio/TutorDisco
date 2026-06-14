-- Canonical schema reference (human-readable mirror of migrations/0001_init.ts).
-- The runtime source of truth is the migrations; keep this file in sync when adding
-- migrations. Do not apply this file directly — the migration runner owns versioning.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE students (
  id                  TEXT PRIMARY KEY NOT NULL,
  name                TEXT NOT NULL,
  email               TEXT,
  parent_email        TEXT,
  grade_level         TEXT,
  school              TEXT,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('lead','active','paused','archived')),
  default_duration    INTEGER NOT NULL DEFAULT 60,
  default_hourly_rate INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  deleted_at          INTEGER,
  sync_status         TEXT NOT NULL DEFAULT 'pending',
  server_rev          INTEGER
);
CREATE INDEX idx_students_status ON students(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_name ON students(name);

CREATE TABLE sessions (
  id           TEXT PRIMARY KEY NOT NULL,
  student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  title        TEXT NOT NULL,
  date         TEXT NOT NULL,
  start_time   TEXT NOT NULL,
  duration     INTEGER NOT NULL,
  hourly_rate  INTEGER NOT NULL DEFAULT 0,
  location     TEXT,
  status       TEXT NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  notes        TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  sync_status  TEXT NOT NULL DEFAULT 'pending',
  server_rev   INTEGER
);
CREATE INDEX idx_sessions_student ON sessions(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_date ON sessions(date) WHERE deleted_at IS NULL;

CREATE TABLE assignments (
  id           TEXT PRIMARY KEY NOT NULL,
  session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  details      TEXT,
  due_date     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','completed')),
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  sync_status  TEXT NOT NULL DEFAULT 'pending',
  server_rev   INTEGER
);
CREATE INDEX idx_assignments_session ON assignments(session_id) WHERE deleted_at IS NULL;

CREATE TABLE checklist_items (
  id           TEXT PRIMARY KEY NOT NULL,
  session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  completed    INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  sync_status  TEXT NOT NULL DEFAULT 'pending',
  server_rev   INTEGER
);
CREATE INDEX idx_checklist_session ON checklist_items(session_id) WHERE deleted_at IS NULL;

CREATE TABLE payments (
  id            TEXT PRIMARY KEY NOT NULL,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  session_id    TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  amount        INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','overdue','cancelled')),
  received_date TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE INDEX idx_payments_student ON payments(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_session ON payments(session_id) WHERE deleted_at IS NULL;

CREATE TABLE email_templates (
  id           TEXT PRIMARY KEY NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  sync_status  TEXT NOT NULL DEFAULT 'pending',
  server_rev   INTEGER
);

CREATE TABLE sat_scores (
  id                    TEXT PRIMARY KEY NOT NULL,
  student_id            TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date                  TEXT NOT NULL,
  test_name             TEXT NOT NULL,
  reading_writing_score INTEGER NOT NULL CHECK (reading_writing_score BETWEEN 200 AND 800),
  math_score            INTEGER NOT NULL CHECK (math_score BETWEEN 200 AND 800),
  total_score           INTEGER NOT NULL CHECK (total_score BETWEEN 400 AND 1600),
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  deleted_at            INTEGER,
  sync_status           TEXT NOT NULL DEFAULT 'pending',
  server_rev            INTEGER
);
CREATE INDEX idx_sat_scores_student ON sat_scores(student_id, date) WHERE deleted_at IS NULL;

CREATE TABLE sat_skill_performance (
  id           TEXT PRIMARY KEY NOT NULL,
  student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill        TEXT NOT NULL,
  accuracy     REAL NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  date         TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  sync_status  TEXT NOT NULL DEFAULT 'pending',
  server_rev   INTEGER
);
CREATE INDEX idx_sat_skill_student ON sat_skill_performance(student_id, skill) WHERE deleted_at IS NULL;
