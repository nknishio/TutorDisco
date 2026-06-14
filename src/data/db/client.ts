/**
 * Database client abstraction.
 *
 * Repositories depend on the `DatabaseClient` INTERFACE, never on expo-sqlite
 * directly. This keeps the data layer swappable (e.g. an in-memory client for tests,
 * or a future synced client) and is the seam the rest of the architecture relies on.
 */
import * as SQLite from 'expo-sqlite';

/** Bind parameters for a parameterized statement. Booleans must be pre-converted to 0/1. */
export type BindValue = string | number | null;
export type BindParams = readonly BindValue[];

export interface RunResult {
  readonly changes: number;
  readonly lastInsertRowId: number;
}

/** The minimal surface repositories need. */
export interface DatabaseClient {
  /** Execute one or more statements with no parameters (DDL, PRAGMA). */
  execute(sql: string): Promise<void>;
  /** Run a single write statement; returns affected-row info. */
  run(sql: string, params?: BindParams): Promise<RunResult>;
  /** Read many rows. */
  getAll<R>(sql: string, params?: BindParams): Promise<R[]>;
  /** Read a single row, or null. */
  getFirst<R>(sql: string, params?: BindParams): Promise<R | null>;
  /** Run `fn` inside a transaction; rolls back if it throws. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

/** Concrete client backed by expo-sqlite (works on iOS, Android, and web/WASM). */
export class ExpoSqliteClient implements DatabaseClient {
  private constructor(private readonly db: SQLite.SQLiteDatabase) {}

  static async open(databaseName: string): Promise<ExpoSqliteClient> {
    const db = await SQLite.openDatabaseAsync(databaseName);
    // Integrity + concurrency pragmas. WAL improves read/write concurrency; foreign
    // keys must be enabled per-connection in SQLite (off by default).
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    return new ExpoSqliteClient(db);
  }

  execute(sql: string): Promise<void> {
    return this.db.execAsync(sql);
  }

  async run(sql: string, params: BindParams = []): Promise<RunResult> {
    const res = await this.db.runAsync(sql, params as SQLite.SQLiteBindValue[]);
    return { changes: res.changes, lastInsertRowId: res.lastInsertRowId };
  }

  getAll<R>(sql: string, params: BindParams = []): Promise<R[]> {
    return this.db.getAllAsync<R>(sql, params as SQLite.SQLiteBindValue[]);
  }

  async getFirst<R>(sql: string, params: BindParams = []): Promise<R | null> {
    return (await this.db.getFirstAsync<R>(sql, params as SQLite.SQLiteBindValue[])) ?? null;
  }

  transaction<T>(fn: () => Promise<T>): Promise<T> {
    // expo-sqlite's withTransactionAsync handles BEGIN/COMMIT/ROLLBACK.
    let result!: T;
    return this.db
      .withTransactionAsync(async () => {
        result = await fn();
      })
      .then(() => result);
  }
}
