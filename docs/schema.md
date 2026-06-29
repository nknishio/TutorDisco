# Database Schema Design

> ⚠️ **Status: original design doc — diverged from the as-built schema.** This describes a
> more ambitious design (e.g. `guardians`, `subjects`, `packages`, `invoices`,
> `sat_attempts`, `sat_targets`) that was **not** implemented as written. The **source of
> truth for the real schema** is the migrations in `src/data/db/migrations/` (0001–0005);
> a current summary lives in `CLAUDE.md` ("Data model"). As built, the tables are:
> `students`, `sessions`, `assignments`, `checklist_items`, `payments`, `email_templates`,
> `sat_scores`, `sat_skill_performance`, `calendar_links`, and a singleton `settings`
> (with `default_checklist_items` and `default_calendar_alerts` JSON columns). A separate
> `easytutor-accounts.db` holds local accounts. Keep this file for design rationale only.

SQLite (`expo-sqlite`). This document is the original schema design; the runtime DDL is
defined by the versioned migrations in `src/data/db/migrations/`.

---

## Design principles

These apply to **every** business table and are the reason the schema looks the way
it does.

1. **UUID text primary keys.** `id TEXT PRIMARY KEY`. Generated client-side (UUID
   v4). Two offline devices can both insert without collision — the prerequisite for
   future sync. No `AUTOINCREMENT` anywhere on business tables.

2. **Sync metadata on every row** (designed in now, used later):
   - `created_at INTEGER NOT NULL` — UTC epoch millis.
   - `updated_at INTEGER NOT NULL` — UTC epoch millis, bumped on every write.
   - `deleted_at INTEGER` — soft-delete tombstone (NULL = live). We never hard-delete
     business rows; a hard delete can't be synced, a tombstone can.
   - `sync_status TEXT NOT NULL DEFAULT 'pending'` — `'synced' | 'pending' | 'conflict'`.
   - `server_rev INTEGER` — server revision/version, NULL until first sync.

3. **Time is UTC epoch millis (INTEGER).** Timezone-free at rest, monotonically
   comparable (essential for last-write-wins), formatted to local time only in the UI.

4. **Money is integer minor units.** `amount_cents INTEGER` + `currency TEXT`. Never
   a float — floats corrupt billing totals.

5. **Foreign keys enforced.** `PRAGMA foreign_keys = ON`. Relations use
   `ON DELETE` rules deliberately (mostly `RESTRICT`/soft-delete, `CASCADE` only for
   wholly-owned children like score sections).

6. **Enums are `TEXT` + `CHECK`.** SQLite has no enum type; `CHECK (col IN (...))`
   plus a TypeScript union (deliverable #3) keeps DB and code in lockstep.

7. **SAT tables always exist.** SAT Mode is a UI flag, not a schema branch. SAT data
   is stored regardless; the toggle only governs visibility.

---

## Entity-relationship overview

```
                    ┌──────────────┐
                    │   settings   │  (single row, app-wide; holds SAT Mode)
                    └──────────────┘

  ┌──────────┐ 1   * ┌──────────────┐
  │ students │───────│  guardians   │   (parent/guardian contacts)
  └────┬─────┘       └──────────────┘
       │ 1
       │
       ├───────────* ┌──────────────┐ *   1 ┌──────────┐
       │             │   sessions   │───────│ subjects │
       │             └──────┬───────┘       └──────────┘
       │                    │ 1
       │                    └──────────* ┌──────────────────┐
       │                                 │ session_homework │
       │                                 └──────────────────┘
       │ 1
       ├───────────* ┌──────────────┐
       │             │   packages   │  (purchased hour blocks / plans)
       │             └──────┬───────┘
       │                    │ 1
       │                    └──────────* ┌──────────────┐
       │                                 │  payments    │
       │                                 └──────────────┘
       │ 1
       ├───────────* ┌──────────────┐
       │             │   invoices   │───────* ┌───────────────┐
       │             └──────────────┘         │ invoice_items │
       │                                       └───────────────┘
       │ 1
       └───────────* ┌──────────────┐ 1   * ┌─────────────────────┐
   (SAT Mode) ──────▶│ sat_attempts │───────│ sat_section_scores  │
                     └──────────────┘       └─────────────────────┘
                            ▲
                            │ optional FK
                     ┌──────────────┐
                     │ sat_targets  │  (per-student goal score)
                     └──────────────┘
```

---

## Core tables (general tutoring — always active)

### `settings` — app-wide singleton

```sql
CREATE TABLE settings (
  id              TEXT PRIMARY KEY DEFAULT 'singleton',  -- enforce one row
  sat_mode        INTEGER NOT NULL DEFAULT 0,            -- boolean: SAT Mode on/off
  theme           TEXT NOT NULL DEFAULT 'system'
                    CHECK (theme IN ('light','dark','system')),
  default_currency TEXT NOT NULL DEFAULT 'USD',
  default_rate_cents INTEGER,                            -- default hourly rate
  timezone        TEXT,                                  -- IANA tz, e.g. 'America/New_York'
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  CHECK (id = 'singleton')
);
```
> **Why a DB row when SAT Mode is also in Zustand prefs?** Zustand `persist` is the
> fast-boot read; this row is the synced, authoritative copy and the home for
> settings that belong with the data (currency, default rate, timezone). On boot we
> hydrate the store from here.

### `students`

```sql
CREATE TABLE students (
  id            TEXT PRIMARY KEY,
  first_name    TEXT NOT NULL,
  last_name     TEXT,
  email         TEXT,
  phone         TEXT,
  grade_level   TEXT,                                    -- '9','10','11','12','college','adult'
  school        TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('lead','active','paused','archived')),
  rate_cents    INTEGER,                                 -- per-student override of default
  currency      TEXT NOT NULL DEFAULT 'USD',
  notes         TEXT,                                    -- freeform
  color         TEXT,                                    -- UI accent for calendar/avatar
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE INDEX idx_students_status ON students(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_name   ON students(last_name, first_name);
```
> `status` includes `lead` so the CRM tracks prospects before they convert.
> Per-student `rate_cents` overrides the global default — common in tutoring.

### `guardians` — parent/guardian contacts (many per student)

```sql
CREATE TABLE guardians (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  relationship  TEXT,                                    -- 'mother','father','guardian',...
  email         TEXT,
  phone         TEXT,
  is_billing_contact INTEGER NOT NULL DEFAULT 0,         -- boolean
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE INDEX idx_guardians_student ON guardians(student_id);
```
> `CASCADE` here is intentional: a guardian is wholly owned by a student and has no
> meaning without it. Contrast with sessions/invoices below.

### `subjects`

```sql
CREATE TABLE subjects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,                           -- 'SAT Math','Algebra II','Spanish'
  is_sat        INTEGER NOT NULL DEFAULT 0,              -- marks SAT-related subjects
  color         TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
```

### `sessions` — the core unit of work (a lesson)

```sql
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  subject_id    TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  package_id    TEXT REFERENCES packages(id) ON DELETE SET NULL,  -- which block it draws from
  starts_at     INTEGER NOT NULL,                        -- UTC epoch millis
  ends_at       INTEGER NOT NULL,
  duration_min  INTEGER NOT NULL,                        -- denormalized for fast totals
  status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  location      TEXT,                                    -- 'online','home','library',...
  rate_cents    INTEGER,                                 -- snapshot of rate at session time
  currency      TEXT NOT NULL DEFAULT 'USD',
  is_billable   INTEGER NOT NULL DEFAULT 1,
  summary       TEXT,                                    -- what was covered
  private_notes TEXT,                                    -- tutor-only notes
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE INDEX idx_sessions_student ON sessions(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_time    ON sessions(starts_at)  WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_status  ON sessions(status);
```
> **`ON DELETE RESTRICT` on student** — you can't lose a student who has session
> history; archive instead. **Rate is snapshotted** onto the session so changing a
> student's rate later doesn't rewrite financial history. **`duration_min`
> denormalized** so "hours this month" is a cheap `SUM`, not a per-row computation.

### `session_homework` — assignments tied to a session

```sql
CREATE TABLE session_homework (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  due_at        INTEGER,
  is_complete   INTEGER NOT NULL DEFAULT 0,
  completed_at  INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE INDEX idx_homework_student ON session_homework(student_id, is_complete);
```

---

## Billing tables (general — always active)

### `packages` — purchased blocks of hours / plans

```sql
CREATE TABLE packages (
  id              TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  name            TEXT,                                  -- '10-hour SAT block'
  total_hours     REAL NOT NULL,                         -- hours purchased
  rate_cents      INTEGER NOT NULL,                      -- price per hour at purchase
  currency        TEXT NOT NULL DEFAULT 'USD',
  purchased_at    INTEGER NOT NULL,
  expires_at      INTEGER,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','depleted','expired','refunded')),
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  server_rev      INTEGER
);
CREATE INDEX idx_packages_student ON packages(student_id, status);
```
> Hours *remaining* is derived (`total_hours` − SUM of completed billable session
> durations drawing on this package), not stored — avoids drift. The domain service
> computes it.

### `payments` — money received

```sql
CREATE TABLE payments (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  package_id    TEXT REFERENCES packages(id) ON DELETE SET NULL,
  amount_cents  INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  method        TEXT CHECK (method IN ('cash','card','transfer','venmo','zelle','paypal','other')),
  paid_at       INTEGER NOT NULL,
  reference     TEXT,                                    -- check #, txn id
  note          TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE INDEX idx_payments_student ON payments(student_id, paid_at);
```

### `invoices` + `invoice_items`

```sql
CREATE TABLE invoices (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  number        TEXT NOT NULL,                           -- human-facing invoice no.
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','paid','overdue','void')),
  issued_at     INTEGER,
  due_at        INTEGER,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents     INTEGER NOT NULL DEFAULT 0,
  total_cents   INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  note          TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE UNIQUE INDEX idx_invoices_number ON invoices(number) WHERE deleted_at IS NULL;

CREATE TABLE invoice_items (
  id            TEXT PRIMARY KEY,
  invoice_id    TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  session_id    TEXT REFERENCES sessions(id) ON DELETE SET NULL,  -- if line = a session
  description   TEXT NOT NULL,
  quantity      REAL NOT NULL DEFAULT 1,                 -- hours or units
  unit_cents    INTEGER NOT NULL,
  amount_cents  INTEGER NOT NULL,                        -- quantity * unit_cents
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
```

---

## SAT tables (always present; surfaced only in SAT Mode)

The digital SAT is scored **400–1600 total**, composed of two sections each
**200–800**: **Reading & Writing (R&W)** and **Math**. We model an *attempt* (a
practice test or official sitting) with per-section scores, plus optional
skill/domain breakdowns for granular progress tracking.

### `sat_attempts` — one practice test or official sitting

```sql
CREATE TABLE sat_attempts (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attempt_type  TEXT NOT NULL DEFAULT 'practice'
                  CHECK (attempt_type IN ('diagnostic','practice','official')),
  source        TEXT,                                    -- 'College Board PT4','Khan',...
  taken_at      INTEGER NOT NULL,
  total_score   INTEGER                                  -- 400..1600, derived from sections
                  CHECK (total_score IS NULL OR (total_score BETWEEN 400 AND 1600)),
  rw_score      INTEGER                                  -- 200..800
                  CHECK (rw_score IS NULL OR (rw_score BETWEEN 200 AND 800)),
  math_score    INTEGER                                  -- 200..800
                  CHECK (math_score IS NULL OR (math_score BETWEEN 200 AND 800)),
  notes         TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE INDEX idx_sat_attempts_student ON sat_attempts(student_id, taken_at);
```
> `CHECK` constraints enforce the official scoring ranges at the storage layer —
> belt-and-suspenders with the TS branded `ScaledScore` type. `total_score` is stored
> (not purely derived) because official reports give a total that may not equal the
> sum after rounding; we keep what the report says.

### `sat_section_scores` — optional fine-grained breakdown

```sql
CREATE TABLE sat_section_scores (
  id            TEXT PRIMARY KEY,
  attempt_id    TEXT NOT NULL REFERENCES sat_attempts(id) ON DELETE CASCADE,
  section       TEXT NOT NULL CHECK (section IN ('reading_writing','math')),
  domain        TEXT,        -- e.g. 'Algebra','Information & Ideas','Standard English'
  raw_correct   INTEGER,     -- # correct in this domain
  raw_total     INTEGER,     -- # questions in this domain
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,
  sync_status   TEXT NOT NULL DEFAULT 'pending',
  server_rev    INTEGER
);
CREATE INDEX idx_sat_section_attempt ON sat_section_scores(attempt_id);
```
> Split into its own table because breakdowns are **optional and variable in count**
> — a quick score entry has none; a detailed diagnostic has many. Keeping them out of
> `sat_attempts` avoids a wide, sparse, nullable table and lets us track skill
> mastery over time per domain.

### `sat_targets` — a student's goal

```sql
CREATE TABLE sat_targets (
  id              TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  target_total    INTEGER CHECK (target_total IS NULL OR target_total BETWEEN 400 AND 1600),
  target_rw       INTEGER CHECK (target_rw IS NULL OR target_rw BETWEEN 200 AND 800),
  target_math     INTEGER CHECK (target_math IS NULL OR target_math BETWEEN 200 AND 800),
  test_date       INTEGER,                               -- the real exam they're prepping for
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  server_rev      INTEGER
);
CREATE INDEX idx_sat_targets_student ON sat_targets(student_id);
```
> Progress (current best vs. target, projected trajectory to `test_date`) is computed
> by a pure domain service from `sat_attempts` + `sat_targets` — never stored.

---

## Migrations & versioning

- `PRAGMA user_version` holds the applied schema version.
- `src/data/db/migrations/0001_init.ts` creates everything above and sets the
  `settings` singleton row.
- The migration runner applies, in a transaction, every migration whose number
  exceeds `user_version`, then bumps it.
- **Migrations are append-only and immutable once shipped.** Fixing a mistake means a
  new migration, never editing an old one — the only safe rule for field devices.

## Indexing rationale (summary)

| Index | Query it accelerates |
|-------|----------------------|
| `idx_sessions_time` | Calendar / "today's sessions" / date-range reports |
| `idx_sessions_student` | A student's full session history |
| `idx_payments_student` | Billing summary per student |
| `idx_sat_attempts_student` | Score-progress chart over time |
| Partial `WHERE deleted_at IS NULL` | Keep tombstones out of hot read paths |

## What is intentionally *derived*, not stored

To prevent drift, these are computed by domain services, never persisted:
hours remaining on a package, total hours taught, outstanding balance, SAT best
score, and SAT target progress. Storing them would create two sources of truth that
inevitably diverge under offline edits + sync.
