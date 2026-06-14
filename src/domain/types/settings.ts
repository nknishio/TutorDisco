/**
 * App-wide settings domain types. (DOMAIN layer — pure TS.)
 *
 * Home of the global SAT Mode flag. SAT Mode is a presentation/capability flag:
 * it governs what the UI exposes, never what is stored.
 */
import type { Cents, CurrencyCode, EpochMillis, Timezone } from './common';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface AppSettings {
  /** Singleton; the data layer enforces a single settings row. */
  readonly id: 'singleton';
  /** THE global toggle. When true, SAT-specific surfaces appear. */
  readonly satMode: boolean;
  readonly theme: ThemePreference;
  readonly defaultCurrency: CurrencyCode;
  readonly defaultRateCents: Cents | null;
  readonly timezone: Timezone | null;
  readonly createdAt: EpochMillis;
  readonly updatedAt: EpochMillis;
}

/** The mutable subset a user can change from the Settings screen. */
export type SettingsPatch = Partial<
  Pick<
    AppSettings,
    'satMode' | 'theme' | 'defaultCurrency' | 'defaultRateCents' | 'timezone'
  >
>;
