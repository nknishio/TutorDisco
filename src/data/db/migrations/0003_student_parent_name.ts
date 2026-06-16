/**
 * Migration 0003 — add students.parent_name.
 *
 * Source for the {{parent_name}} email-template variable. Nullable so existing rows
 * stay valid. Append-only and immutable like all migrations (docs/schema.md).
 */
import type { Migration } from './index';

export const migration0003StudentParentName: Migration = {
  version: 3,
  name: 'student_parent_name',
  statements: [`ALTER TABLE students ADD COLUMN parent_name TEXT;`],
};
