/**
 * Migration 0002 — calendar links + app settings.
 *
 *  - `calendar_links`: bridges a session to an external calendar event (provider +
 *     external id) so events can be updated/removed and survive app restarts.
 *  - `settings`: the singleton AppSettings row (home of the global SAT Mode flag).
 *
 * Append-only and immutable once shipped, like all migrations (docs/schema.md).
 */
import type { Migration } from './index';

export const migration0002CalendarSettings: Migration = {
  version: 2,
  name: 'calendar_settings',
  statements: [
    // --- calendar_links -------------------------------------------------
    `CREATE TABLE calendar_links (
      id                TEXT PRIMARY KEY NOT NULL,
      session_id        TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      provider          TEXT NOT NULL
                          CHECK (provider IN ('apple','google','outlook','ics')),
      external_event_id TEXT NOT NULL,
      calendar_id       TEXT,
      title             TEXT NOT NULL,
      synced_at         INTEGER NOT NULL,
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL,
      deleted_at        INTEGER,
      sync_status       TEXT NOT NULL DEFAULT 'pending',
      server_rev        INTEGER
    );`,
    `CREATE INDEX idx_calendar_links_session ON calendar_links(session_id) WHERE deleted_at IS NULL;`,

    // --- settings (singleton) -------------------------------------------
    `CREATE TABLE settings (
      id                 TEXT PRIMARY KEY NOT NULL CHECK (id = 'singleton'),
      sat_mode           INTEGER NOT NULL DEFAULT 0,
      theme              TEXT NOT NULL DEFAULT 'system'
                           CHECK (theme IN ('light','dark','system')),
      default_currency   TEXT NOT NULL DEFAULT 'USD',
      default_rate_cents INTEGER,
      timezone           TEXT,
      created_at         INTEGER NOT NULL,
      updated_at         INTEGER NOT NULL
    );`,
  ],
};
