/**
 * Migration 0007 — email-template custom order.
 *
 * Adds a JSON array of email-template ids to the singleton settings row. It backs the
 * drag-to-reorder order on the Templates screen, which the session email-generator's
 * template dropdown also follows. Empty by default (falls back to newest-first).
 *
 * Append-only and immutable once shipped, like all migrations (docs/schema.md).
 */
import type { Migration } from './index';

export const migration0007EmailTemplateOrder: Migration = {
  version: 7,
  name: 'email_template_order',
  statements: [
    `ALTER TABLE settings ADD COLUMN email_template_order TEXT NOT NULL DEFAULT '[]';`,
  ],
};
