/**
 * AppleCalendarProvider — device calendar via expo-calendar (iOS Calendar / Android
 * provider). Implements the CalendarProvider port so the scheduling UI is unaware of
 * the native API. All operations return Result; permission is checked separately via
 * ensurePermission(). On web the device calendar is unsupported and reported as such.
 */
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import type { CalendarProvider } from '../../domain/calendar/provider';
import type {
  CalendarEventDraft,
  CalendarPermissionStatus,
} from '../../domain/types/calendar';
import { err, ok } from '../../shared/utils/result';

const PROVIDER_ID = 'apple' as const;

const mapPermission = (status: string): CalendarPermissionStatus => {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
};

const toNativeEvent = (draft: CalendarEventDraft) => ({
  title: draft.title,
  startDate: draft.startsAt,
  endDate: draft.endsAt,
  location: draft.location ?? undefined,
  notes: draft.notes ?? undefined,
});

/** Find a calendar we can write to: the iOS default, else the first modifiable one. */
const pickWritableCalendarId = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'ios') {
      const def = await Calendar.getDefaultCalendarAsync();
      if (def?.id) return def.id;
    }
  } catch {
    // No default; fall through to a scan.
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c) => c.allowsModifications);
  return writable?.id ?? calendars[0]?.id ?? null;
};

export const appleCalendarProvider: CalendarProvider = {
  id: PROVIDER_ID,
  displayName: 'Device Calendar',
  supportsSync: true,

  async ensurePermission(): Promise<CalendarPermissionStatus> {
    if (Platform.OS === 'web') return 'unsupported';
    try {
      let res = await Calendar.getCalendarPermissionsAsync();
      if (mapPermission(String(res.status)) !== 'granted') {
        res = await Calendar.requestCalendarPermissionsAsync();
      }
      return mapPermission(String(res.status));
    } catch {
      return 'unsupported';
    }
  },

  async addEvent(draft) {
    if (Platform.OS === 'web') return err('unknown', 'Device calendar is unavailable on web.');
    try {
      const calendarId = await pickWritableCalendarId();
      if (!calendarId) return err('unknown', 'No writable calendar was found on this device.');
      const eventId = await Calendar.createEventAsync(calendarId, toNativeEvent(draft));
      return ok({ provider: PROVIDER_ID, externalEventId: eventId, calendarId });
    } catch (e) {
      return err('unknown', 'Failed to add the event to the device calendar.', e);
    }
  },

  async updateEvent(ref, draft) {
    if (Platform.OS === 'web') return err('unknown', 'Device calendar is unavailable on web.');
    try {
      await Calendar.updateEventAsync(ref.externalEventId, toNativeEvent(draft));
      return ok(ref);
    } catch (e) {
      return err('unknown', 'Failed to update the device calendar event.', e);
    }
  },

  async removeEvent(ref) {
    if (Platform.OS === 'web') return err('unknown', 'Device calendar is unavailable on web.');
    try {
      await Calendar.deleteEventAsync(ref.externalEventId);
      return ok(undefined);
    } catch (e) {
      return err('unknown', 'Failed to remove the device calendar event.', e);
    }
  },
};
