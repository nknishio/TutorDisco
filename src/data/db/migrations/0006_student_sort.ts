/**
 * Migration 0006 — students-list sort preferences.
 *
 * Adds three columns to the singleton settings row that back the students-list "sort
 * by" control: the active key, its direction, and the hand-arranged custom order
 * (a JSON array of student ids). Defaults reproduce the previous behaviour — newest
 * student first — via an empty custom order shown ascending.
 *
 * Append-only and immutable once shipped, like all migrations (docs/schema.md).
 */
import type { Migration } from './index';

export const migration0006StudentSort: Migration = {
  version: 6,
  name: 'student_sort',
  statements: [
    `ALTER TABLE settings ADD COLUMN student_sort_key TEXT NOT NULL DEFAULT 'custom';`,
    `ALTER TABLE settings ADD COLUMN student_sort_dir TEXT NOT NULL DEFAULT 'asc';`,
    `ALTER TABLE settings ADD COLUMN student_custom_order TEXT NOT NULL DEFAULT '[]';`,
  ],
};
