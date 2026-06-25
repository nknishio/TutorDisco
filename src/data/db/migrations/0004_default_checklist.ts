/**
 * Migration 0004 — default checklist items.
 *
 * Adds a JSON-encoded list of default checklist item texts to the singleton settings
 * row. These are offered (pre-checked, individually skippable) when creating a session
 * so a tutor's routine to-dos get attached without retyping them every time.
 *
 * Append-only and immutable once shipped, like all migrations (docs/schema.md).
 */
import type { Migration } from './index';

export const migration0004DefaultChecklist: Migration = {
  version: 4,
  name: 'default_checklist',
  statements: [
    `ALTER TABLE settings ADD COLUMN default_checklist_items TEXT NOT NULL DEFAULT '[]';`,
  ],
};
