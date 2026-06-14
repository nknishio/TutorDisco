/**
 * Generic SQLite repository.
 *
 * Implements the CRUD surface once, parameterized by table name, mapper, and a
 * validator. Concrete repositories extend this and add entity-specific finders.
 * Every write runs validation first, so invalid data never reaches the DB.
 *
 * Update strategy is read-merge-validate-write: we load the existing row, merge the
 * patch, validate the full business shape, then write all columns. Simpler and safer
 * than per-field SQL building, and on local SQLite the extra read is negligible.
 */
import type {
  CreateInput,
  Entity,
  Result,
  Row,
  SyncMeta,
  UpdateInput,
  Uuid,
} from '../../domain/types/common';
import type { ListOptions, Repository } from '../../domain/repositories';
import { err, ok } from '../../shared/utils/result';
import { newUuid } from '../../shared/utils/id';
import { nowMillis } from '../../shared/utils/time';
import type { ValidationResult } from '../../shared/validation';
import type { DatabaseClient } from '../db/client';
import type { RowMapper } from '../mappers';

const SYSTEM_KEYS: readonly string[] = [
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'syncStatus',
  'serverRev',
];

/** Drop system-managed fields, leaving only the business payload for validation. */
const businessFields = <T extends Entity<Uuid>>(entity: T): CreateInput<T> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entity)) {
    if (!SYSTEM_KEYS.includes(k)) out[k] = v;
  }
  return out as CreateInput<T>;
};

const toValidationError = (errors: { field: string; message: string }[]) =>
  err(
    'validation',
    errors.map((e) => `${e.field}: ${e.message}`).join('; '),
    errors,
  );

export abstract class BaseSqliteRepository<
  T extends Entity<Id>,
  Id extends Uuid,
> implements Repository<T, Id>
{
  protected constructor(
    protected readonly db: DatabaseClient,
    protected readonly table: string,
    protected readonly mapper: RowMapper<T>,
    protected readonly validate: (
      input: CreateInput<T>,
    ) => ValidationResult<CreateInput<T>>,
  ) {}

  // --- create -------------------------------------------------------------
  async create(input: CreateInput<T>): Promise<Result<T>> {
    const validation = this.validate(input);
    if (!validation.ok) return toValidationError([...validation.errors]);

    const now = nowMillis();
    const meta: SyncMeta = {
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'pending',
      serverRev: null,
    };
    const entity = {
      ...(validation.value as object),
      ...meta,
      id: newUuid() as Id,
    } as T;

    try {
      await this.insertRow(this.mapper.toRow(entity));
      return ok(entity);
    } catch (e) {
      return err('db', `Failed to create ${this.table}`, e);
    }
  }

  // --- read ---------------------------------------------------------------
  async getById(id: Id): Promise<T | null> {
    const row = await this.db.getFirst<Row>(
      `SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? this.mapper.fromRow(row) : null;
  }

  async list(opts: ListOptions = {}): Promise<readonly T[]> {
    const rows = await this.db.getAll<Row>(
      `SELECT * FROM ${this.table}${this.whereLive(opts)} ORDER BY created_at DESC${this.pagination(opts)}`,
    );
    return rows.map((r) => this.mapper.fromRow(r));
  }

  async count(opts: ListOptions = {}): Promise<number> {
    const row = await this.db.getFirst<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${this.table}${this.whereLive(opts)}`,
    );
    return row?.n ?? 0;
  }

  // --- update -------------------------------------------------------------
  async update(patch: UpdateInput<T>): Promise<Result<T>> {
    const existing = await this.getById(patch.id);
    if (!existing) return err('not_found', `${this.table} ${patch.id} not found`);

    const merged = { ...existing, ...patch, id: existing.id } as T;
    const validation = this.validate(businessFields(merged));
    if (!validation.ok) return toValidationError([...validation.errors]);

    const updated = {
      ...merged,
      updatedAt: nowMillis(),
      syncStatus: 'pending',
    } as T;

    try {
      await this.updateRow(this.mapper.toRow(updated));
      return ok(updated);
    } catch (e) {
      return err('db', `Failed to update ${this.table}`, e);
    }
  }

  // --- delete -------------------------------------------------------------
  async softDelete(id: Id): Promise<Result<void>> {
    const now = nowMillis();
    const res = await this.db.run(
      `UPDATE ${this.table} SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL`,
      [now, now, id],
    );
    return res.changes === 0
      ? err('not_found', `${this.table} ${id} not found`)
      : ok(undefined);
  }

  async hardDelete(id: Id): Promise<Result<void>> {
    const res = await this.db.run(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
    return res.changes === 0
      ? err('not_found', `${this.table} ${id} not found`)
      : ok(undefined);
  }

  // --- shared query helpers for subclasses --------------------------------
  /** Map raw rows from a custom finder query through the entity mapper. */
  protected async query(sql: string, params: readonly (string | number | null)[] = []): Promise<readonly T[]> {
    const rows = await this.db.getAll<Row>(sql, params);
    return rows.map((r) => this.mapper.fromRow(r));
  }

  protected whereLive(opts: ListOptions): string {
    return opts.includeDeleted ? '' : ' WHERE deleted_at IS NULL';
  }

  protected pagination(opts: ListOptions): string {
    let s = '';
    if (typeof opts.limit === 'number') s += ` LIMIT ${opts.limit}`;
    if (typeof opts.offset === 'number') s += ` OFFSET ${opts.offset}`;
    return s;
  }

  // --- private write helpers ----------------------------------------------
  private async insertRow(row: Row): Promise<void> {
    const cols = Object.keys(row);
    const placeholders = cols.map(() => '?').join(', ');
    await this.db.run(
      `INSERT INTO ${this.table} (${cols.join(', ')}) VALUES (${placeholders})`,
      cols.map((c) => row[c]),
    );
  }

  private async updateRow(row: Row): Promise<void> {
    const cols = Object.keys(row).filter((c) => c !== 'id');
    const assignments = cols.map((c) => `${c} = ?`).join(', ');
    await this.db.run(
      `UPDATE ${this.table} SET ${assignments} WHERE id = ?`,
      [...cols.map((c) => row[c]), row.id],
    );
  }
}
