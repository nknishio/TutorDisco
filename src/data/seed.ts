/**
 * First-run seeding. Inserts the default email templates with stable ids using
 * INSERT OR IGNORE, so it is idempotent: defaults are created once, user edits are
 * preserved (same id, never overwritten), and a default the user deletes (soft delete)
 * is not resurrected on the next launch (its id still exists in the row).
 */
import { DEFAULT_TEMPLATES } from '../domain/services/templates';
import type { DatabaseClient } from './db/client';

export const seedDefaultTemplates = async (db: DatabaseClient): Promise<void> => {
  const now = Date.now();
  for (const t of DEFAULT_TEMPLATES) {
    await db.run(
      `INSERT OR IGNORE INTO email_templates
         (id, title, content, created_at, updated_at, deleted_at, sync_status, server_rev)
       VALUES (?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
      [t.id, t.title, t.content, now, now],
    );
  }
};
