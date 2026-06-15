/**
 * Calendar provider registry. The single place that knows which concrete providers
 * exist in this build. To add Google/Outlook later: implement the CalendarProvider
 * port and register it here — no scheduling component changes.
 */
import type { CalendarProvider } from '../../domain/calendar/provider';
import type { CalendarProviderId } from '../../domain/types/calendar';
import { appleCalendarProvider } from './AppleCalendarProvider';
import { icsProvider } from './IcsProvider';

/** Providers shipped in this build, in display order. */
export const AVAILABLE_PROVIDERS: readonly CalendarProvider[] = [
  appleCalendarProvider,
  icsProvider,
];

const BY_ID: Partial<Record<CalendarProviderId, CalendarProvider>> = {
  apple: appleCalendarProvider,
  ics: icsProvider,
};

/** The provider used when none has been chosen yet. */
export const DEFAULT_PROVIDER_ID: CalendarProviderId = 'apple';

export const getCalendarProvider = (id: CalendarProviderId): CalendarProvider | null =>
  BY_ID[id] ?? null;
