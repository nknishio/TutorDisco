export const BACKUP_FORMAT_VERSION = 1;

/**
 * JSON backup format. `tables` maps each table name to its rows as returned
 * by SQLite (snake_case column names, booleans as 0/1, timestamps as epoch ms,
 * JSON arrays as TEXT — same as the raw DB).
 */
export interface BackupData {
  formatVersion: number;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}
