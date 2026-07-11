/**
 * App-wide settings domain types. (DOMAIN layer — pure TS.)
 *
 * Home of the global SAT Mode flag. SAT Mode is a presentation/capability flag:
 * it governs what the UI exposes, never what is stored.
 */
import type { Cents, CurrencyCode, EpochMillis, Timezone } from './common';

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * How the students list is ordered. `custom` is a hand-arranged order the user drags
 * into place (persisted in `studentCustomOrder`); the rest are derived from student
 * data. `custom` survives switching to another key and back.
 */
export type StudentSortKey =
  | 'name'
  | 'nextSession'
  | 'firstSession'
  | 'rate'
  | 'status'
  | 'custom';

/** Sort direction. `asc` is each key's natural order; `desc` reverses it. */
export type StudentSortDir = 'asc' | 'desc';

export interface AppSettings {
  /** Singleton; the data layer enforces a single settings row. */
  readonly id: 'singleton';
  /** THE global toggle. When true, SAT-specific surfaces appear. */
  readonly satMode: boolean;
  readonly theme: ThemePreference;
  readonly defaultCurrency: CurrencyCode;
  readonly defaultRateCents: Cents | null;
  readonly timezone: Timezone | null;
  /**
   * Checklist item texts offered (pre-checked, individually skippable) when creating a
   * new session, so a tutor's routine to-dos attach without retyping them each time.
   */
  readonly defaultChecklistItems: readonly string[];
  /**
   * Default calendar reminders for new sessions, as whole minutes before the start
   * (0 = at the time of the event).
   */
  readonly defaultCalendarAlerts: readonly number[];
  /** Which key the students list is sorted by. */
  readonly studentSortKey: StudentSortKey;
  /** Direction applied to the active sort key. */
  readonly studentSortDir: StudentSortDir;
  /**
   * The hand-arranged custom order, as an ordered list of student ids. Persisted
   * independently of `studentSortKey` so it is preserved when the user switches to
   * another sort and back. Ids no longer present are ignored; students missing from
   * the list fall to the top (newest-added-first).
   */
  readonly studentCustomOrder: readonly string[];
  /**
   * Hand-arranged order of email templates, as an ordered list of template ids. Drives
   * the Templates screen and the template dropdown when generating a session email.
   * Ids no longer present are ignored; templates missing from the list fall to the top.
   */
  readonly emailTemplateOrder: readonly string[];
  readonly createdAt: EpochMillis;
  readonly updatedAt: EpochMillis;
}

/** The mutable subset a user can change from the Settings screen. */
export type SettingsPatch = Partial<
  Pick<
    AppSettings,
    | 'satMode'
    | 'theme'
    | 'defaultCurrency'
    | 'defaultRateCents'
    | 'timezone'
    | 'defaultChecklistItems'
    | 'defaultCalendarAlerts'
    | 'studentSortKey'
    | 'studentSortDir'
    | 'studentCustomOrder'
    | 'emailTemplateOrder'
  >
>;
