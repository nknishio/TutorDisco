/**
 * Calendar integration domain types. (DOMAIN layer — pure TS.)
 *
 * `CalendarEventLink` is the persisted bridge between an app Session and an event in
 * an external calendar (device, ICS, …). Storing the provider + external id lets us
 * update or remove the event later, and keeps sessions linked across app restarts.
 *
 * The value types (`CalendarEventDraft`, `ExternalEventRef`, permission status) are
 * the provider-agnostic vocabulary the scheduling UI speaks; concrete providers
 * translate them to their own APIs. New providers can be added without changing the UI.
 */
import type {
  CalendarEventLinkId,
  Entity,
  EpochMillis,
  SessionId,
} from './common';

/**
 * Known calendar providers. Only `apple` (device) and `ics` are implemented today;
 * `google`/`outlook` are reserved so the abstraction and storage are forward-compatible.
 */
export type CalendarProviderId = 'apple' | 'google' | 'outlook' | 'ics';

export const CALENDAR_PROVIDER_IDS: readonly CalendarProviderId[] = [
  'apple',
  'google',
  'outlook',
  'ics',
];

/** Runtime permission state for a provider that needs OS authorization. */
export type CalendarPermissionStatus =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unsupported';

/** A provider-agnostic event to create or update. Times are resolved local instants. */
export interface CalendarEventDraft {
  readonly title: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly location: string | null;
  readonly notes: string | null;
}

/** A handle to an event already created in a provider, used to update/remove it. */
export interface ExternalEventRef {
  readonly provider: CalendarProviderId;
  /** Provider-native event id. */
  readonly externalEventId: string;
  /** Provider container id (e.g. the device calendar the event lives in), if any. */
  readonly calendarId: string | null;
}

/** Persisted link between a Session and its external calendar event. */
export interface CalendarEventLink extends Entity<CalendarEventLinkId> {
  readonly sessionId: SessionId;
  readonly provider: CalendarProviderId;
  readonly externalEventId: string;
  readonly calendarId: string | null;
  /** Title last written to the provider (for display). */
  readonly title: string;
  /** When the event was last successfully pushed to the provider. */
  readonly syncedAt: EpochMillis;
}
