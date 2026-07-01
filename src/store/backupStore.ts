import { create } from 'zustand';
import { getDb, getSchemaVersion } from '../app/di/container';
import {
  exportBackup,
  isBackupData,
  restoreBackup,
  validateBackupCompatibility,
} from '../data/backup';
import { shareBackupFile } from '../shared/utils/backupFile';
import { resetAllStores } from './reset';
import type { Result } from '../domain/types/common';
import { err, ok } from '../shared/utils/result';

interface BackupState {
  exporting: boolean;
  restoring: boolean;
  error: string | null;

  exportData: () => Promise<Result<void>>;
  restoreFromJson: (json: string) => Promise<Result<void>>;
  clearError: () => void;
}

export const useBackupStore = create<BackupState>((set) => ({
  exporting: false,
  restoring: false,
  error: null,

  exportData: async () => {
    set({ exporting: true, error: null });
    try {
      const db = getDb();
      const schemaVersion = getSchemaVersion();
      const backup = await exportBackup(db, schemaVersion);
      const json = JSON.stringify(backup, null, 2);
      const date = new Date().toISOString().slice(0, 10);
      await shareBackupFile(json, `tutordisco-backup-${date}.json`);
      set({ exporting: false });
      return ok(undefined);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Export failed.';
      set({ exporting: false, error: message });
      return err('unknown', message, e);
    }
  },

  restoreFromJson: async (json: string) => {
    set({ restoring: true, error: null });
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json) as unknown;
      } catch {
        const message = 'Could not parse the backup — make sure you pasted valid JSON.';
        set({ restoring: false, error: message });
        return err('validation', message);
      }

      if (!isBackupData(parsed)) {
        const message = 'This does not look like a TutorDisco backup file.';
        set({ restoring: false, error: message });
        return err('validation', message);
      }

      const compatError = validateBackupCompatibility(parsed, getSchemaVersion());
      if (compatError) {
        set({ restoring: false, error: compatError });
        return err('validation', compatError);
      }

      await restoreBackup(getDb(), parsed);
      resetAllStores();
      set({ restoring: false });
      return ok(undefined);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Restore failed.';
      set({ restoring: false, error: message });
      return err('unknown', message, e);
    }
  },

  clearError: () => set({ error: null }),
}));
