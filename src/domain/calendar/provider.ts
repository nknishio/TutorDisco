/**
 * CalendarProvider port. (DOMAIN layer — pure TS, the seam for calendar integration.)
 *
 * The scheduling UI depends only on this interface, never on a concrete provider. To
 * add a provider (Google, Outlook, …) implement this interface and register it; no
 * scheduling component changes. Operations return `Result` so the UI can surface
 * failures gracefully instead of catching thrown errors.
 */
import type { Result } from '../types/common';
import type {
  CalendarEventDraft,
  CalendarPermissionStatus,
  CalendarProviderId,
  ExternalEventRef,
} from '../types/calendar';

export interface CalendarProvider {
  readonly id: CalendarProviderId;
  readonly displayName: string;
  /**
   * True when the provider keeps a persistent event we can later update/remove
   * (e.g. the device calendar). False for one-shot export (ICS), where update is a
   * re-export and remove is a no-op.
   */
  readonly supportsSync: boolean;

  /** Check/request OS authorization. Returns 'granted' for providers needing none. */
  ensurePermission(): Promise<CalendarPermissionStatus>;

  addEvent(draft: CalendarEventDraft): Promise<Result<ExternalEventRef>>;
  updateEvent(
    ref: ExternalEventRef,
    draft: CalendarEventDraft,
  ): Promise<Result<ExternalEventRef>>;
  removeEvent(ref: ExternalEventRef): Promise<Result<void>>;
}
