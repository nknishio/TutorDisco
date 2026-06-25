/**
 * Migration 0005 — default calendar alerts.
 *
 * Adds a JSON-encoded list of default reminder offsets (whole minutes before the
 * start; 0 = at the time of the event) to the singleton settings row. These pre-select
 * the alerts offered when adding a session to the calendar.
 *
 * Append-only and immutable once shipped, like all migrations (docs/schema.md).
 */
import type { Migration } from './index';

export const migration0005DefaultCalendarAlerts: Migration = {
  version: 5,
  name: 'default_calendar_alerts',
  statements: [
    `ALTER TABLE settings ADD COLUMN default_calendar_alerts TEXT NOT NULL DEFAULT '[]';`,
  ],
};
