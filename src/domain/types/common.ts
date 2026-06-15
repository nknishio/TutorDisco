/**
 * Common domain primitives shared across all entities.
 *
 * DOMAIN layer: pure TypeScript, zero external imports. Single source of truth for
 * cross-cutting types. The SQLite schema and the data-layer mappers conform to these.
 */

// ---------------------------------------------------------------------------
// Branded primitives
// ---------------------------------------------------------------------------
// Branding prevents mixing up IDs of different entities and stops raw numbers/strings
// from masquerading as validated money, scores, dates, etc. The brand exists only at
// compile time — at runtime these are plain strings/numbers, so there is zero overhead.

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

/** UTC timestamp in epoch milliseconds. Used for audit instants (created/updated). */
export type EpochMillis = Brand<number, 'EpochMillis'>;

/** Money in integer minor units (cents). Never a float. */
export type Cents = Brand<number, 'Cents'>;

/** A calendar date with no time/zone, formatted 'YYYY-MM-DD'. */
export type IsoDate = Brand<string, 'IsoDate'>;

/** A wall-clock time of day, formatted 'HH:mm' (24h). */
export type IsoTime = Brand<string, 'IsoTime'>;

/** A percentage in the inclusive range 0–100. */
export type Percentage = Brand<number, 'Percentage'>;

/** ISO 4217 currency code, e.g. 'USD'. */
export type CurrencyCode = Brand<string, 'CurrencyCode'>;

/** IANA timezone identifier, e.g. 'America/New_York'. */
export type Timezone = Brand<string, 'Timezone'>;

/** A UUID v4 string used as a primary key. */
export type Uuid = Brand<string, 'Uuid'>;

// ---------------------------------------------------------------------------
// Branded entity IDs
// ---------------------------------------------------------------------------
export type StudentId = Brand<Uuid, 'StudentId'>;
export type SessionId = Brand<Uuid, 'SessionId'>;
export type AssignmentId = Brand<Uuid, 'AssignmentId'>;
export type ChecklistItemId = Brand<Uuid, 'ChecklistItemId'>;
export type PaymentId = Brand<Uuid, 'PaymentId'>;
export type CalendarEventLinkId = Brand<Uuid, 'CalendarEventLinkId'>;
export type EmailTemplateId = Brand<Uuid, 'EmailTemplateId'>;
export type SatScoreId = Brand<Uuid, 'SatScoreId'>;
export type SatSkillPerformanceId = Brand<Uuid, 'SatSkillPerformanceId'>;

// ---------------------------------------------------------------------------
// Sync metadata — present on every persisted business entity
// ---------------------------------------------------------------------------
// Designed in now so a future cloud-sync engine has the hooks it needs. Today
// repositories stamp timestamps and leave syncStatus = 'pending'.

export type SyncStatus = 'synced' | 'pending' | 'conflict';

/** Audit + soft-delete + sync columns shared by every business entity. */
export interface SyncMeta {
  readonly createdAt: EpochMillis;
  readonly updatedAt: EpochMillis;
  /** Soft-delete tombstone. null = live row. */
  readonly deletedAt: EpochMillis | null;
  readonly syncStatus: SyncStatus;
  /** Server revision; null until first successful sync. */
  readonly serverRev: number | null;
}

/** Base every persisted entity extends, narrowing `id` to its branded type. */
export interface Entity<Id extends Uuid> extends SyncMeta {
  readonly id: Id;
}

// ---------------------------------------------------------------------------
// Result type — explicit fallible operations instead of throwing across layers
// ---------------------------------------------------------------------------
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export type AppErrorCode =
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'db'
  | 'unknown';

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  /** Optional underlying cause (e.g. validation issues, the original throwable). */
  readonly cause?: unknown;
}

// ---------------------------------------------------------------------------
// Input helper types
// ---------------------------------------------------------------------------
// On create/update, callers never supply id or sync metadata — the repository owns
// them. These utility types derive create/update payloads from an entity so they
// can never drift from the entity definition.

/** Fields the system owns and callers never provide. */
export type SystemManagedKeys = keyof Entity<Uuid>;

/** Payload to create an entity: everything except system-managed fields. */
export type CreateInput<T extends Entity<Uuid>> = Omit<T, SystemManagedKeys>;

/** Payload to update an entity: id + any subset of the mutable fields. */
export type UpdateInput<T extends Entity<Uuid>> = { readonly id: T['id'] } & Partial<
  CreateInput<T>
>;

/** A raw row as it comes out of SQLite (snake_case, scalar) before mapping. */
export type Row = Readonly<Record<string, string | number | null>>;
