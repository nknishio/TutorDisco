/**
 * Dependency-injection container.
 *
 * Owns the single DataLayer (SQLite + repositories) for the app. Built once at
 * startup. Stores reach repositories through `getRepositories()` rather than
 * importing SQLite directly — so the implementation can be swapped (tests, future
 * cloud-sync client) without touching store or UI code (architecture.md §3, §9).
 */
import { initDataLayer, type DataLayer } from '../../data';
import type { Repositories } from '../../domain/repositories';

let container: DataLayer | null = null;

/** Initialize the container once. Safe to call repeatedly (returns the existing one). */
export const initContainer = async (databaseName?: string): Promise<DataLayer> => {
  if (container) return container;
  container = await initDataLayer(databaseName);
  return container;
};

/**
 * Switch the active database (e.g. on login / account switch). Tears down the current
 * data layer — closing its connection — and rebuilds against `databaseName`.
 */
export const reinitContainer = async (databaseName: string): Promise<DataLayer> => {
  if (container) {
    try {
      await container.db.close();
    } catch {
      // Best-effort close; proceed with the swap regardless.
    }
    container = null;
  }
  container = await initDataLayer(databaseName);
  return container;
};

/** Whether a data layer is currently initialized. */
export const hasContainer = (): boolean => container !== null;

/** Access repositories. Throws if called before `initContainer` resolves. */
export const getRepositories = (): Repositories => {
  if (!container) {
    throw new Error('Container not initialized — call initContainer() at startup first.');
  }
  return container.repositories;
};

/** Test seam: inject a prebuilt data layer (e.g. backed by an in-memory client). */
export const setContainer = (dataLayer: DataLayer): void => {
  container = dataLayer;
};

/** Test seam: tear down so the next initContainer rebuilds. */
export const resetContainer = (): void => {
  container = null;
};
