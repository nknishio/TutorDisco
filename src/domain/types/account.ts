/**
 * Local account domain type. (DOMAIN layer — pure TS.)
 *
 * Accounts gate access to per-user tutoring data. Each account owns its own SQLite
 * database (`dbName`), so users' data is fully separated on-device. The credential
 * material (salt + password hash) lives only in the accounts registry DB, never here.
 */
import type { EpochMillis } from './common';

export interface Account {
  readonly id: string;
  /** Normalized (lowercased, trimmed) login handle; unique across accounts. */
  readonly username: string;
  readonly displayName: string;
  /** SQLite database name backing this account's tutoring data. */
  readonly dbName: string;
  readonly createdAt: EpochMillis;
}
