/**
 * Migration runner.
 *
 * Schema version is tracked in SQLite's `PRAGMA user_version`. On boot we apply, in
 * order and inside a transaction, every migration whose version exceeds the stored
 * one, then bump the stored version. Migrations are append-only and immutable once
 * shipped — the only safe contract for devices in the field.
 */
import type { DatabaseClient } from '../client';
import { migration0001Init } from './0001_init';
import { migration0002CalendarSettings } from './0002_calendar_settings';
import { migration0003StudentParentName } from './0003_student_parent_name';

export interface Migration {
  /** Monotonic version. Must be unique and ordered. */
  readonly version: number;
  readonly name: string;
  /** Statements applied in array order within a single transaction. */
  readonly statements: readonly string[];
}

/** All migrations, in ascending version order. Append new ones here; never edit old. */
export const MIGRATIONS: readonly Migration[] = [
  migration0001Init,
  migration0002CalendarSettings,
  migration0003StudentParentName,
];

const getUserVersion = async (db: DatabaseClient): Promise<number> => {
  const row = await db.getFirst<{ user_version: number }>('PRAGMA user_version;');
  return row?.user_version ?? 0;
};

/**
 * Apply all pending migrations. Returns the version the DB is at afterwards.
 * `user_version` cannot be parameterized, so it is interpolated — values are our
 * own trusted integers, never user input.
 */
export const runMigrations = async (db: DatabaseClient): Promise<number> => {
  const current = await getUserVersion(db);
  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await db.transaction(async () => {
      for (const statement of migration.statements) {
        await db.execute(statement);
      }
      await db.execute(`PRAGMA user_version = ${migration.version};`);
    });
  }

  const last = pending.at(-1);
  return last ? last.version : current;
};
