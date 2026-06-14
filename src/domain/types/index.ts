/**
 * Barrel for all domain types.
 *
 * DOMAIN layer — pure TypeScript, zero external imports. Single source of truth for
 * the app's data shapes; the SQLite schema (docs/schema.md) and the data-layer
 * mappers must conform to these types.
 */
export * from './common';
export * from './settings';
export * from './student';
export * from './session';
export * from './assignment';
export * from './checklist';
export * from './payment';
export * from './emailTemplate';
export * from './sat';
