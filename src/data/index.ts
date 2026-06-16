/**
 * Data-layer composition entry point.
 *
 * Opens the SQLite database, applies pending migrations, and constructs the
 * repository set. The app's DI container (app/di/container.ts) calls this once at
 * startup and injects the returned `Repositories` into the Zustand stores.
 */
import type { Repositories } from '../domain/repositories';
import { DatabaseClient, ExpoSqliteClient } from './db/client';
import { runMigrations } from './db/migrations';
import { createRepositories } from './repositories';
import { seedDefaultTemplates } from './seed';

export interface DataLayer {
  readonly db: DatabaseClient;
  readonly repositories: Repositories;
  /** Schema version the DB is at after migration. */
  readonly schemaVersion: number;
}

const DEFAULT_DB_NAME = 'tutor.db';

/** Open, migrate, and wire the data layer. Idempotent migrations make re-calls safe. */
export const initDataLayer = async (
  databaseName: string = DEFAULT_DB_NAME,
): Promise<DataLayer> => {
  const db = await ExpoSqliteClient.open(databaseName);
  const schemaVersion = await runMigrations(db);
  await seedDefaultTemplates(db);
  const repositories = createRepositories(db);
  return { db, repositories, schemaVersion };
};

export type { DatabaseClient } from './db/client';
export { createRepositories } from './repositories';
