/**
 * IcsProvider — exports a session as a standard .ics file any calendar app can import.
 *
 * No accounts or OS permission required. On native it writes a temp .ics and opens the
 * share sheet (expo-file-system + expo-sharing); on web it triggers a file download.
 * It's a one-shot export, so `supportsSync` is false: "update" re-exports and "remove"
 * is a no-op (we can't recall a file the user already imported).
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { CalendarProvider } from '../../domain/calendar/provider';
import type { CalendarEventDraft, ExternalEventRef } from '../../domain/types/calendar';
import type { Result } from '../../domain/types/common';
import { buildIcsContent } from '../../domain/services/calendar';
import { newUuid } from '../../shared/utils/id';
import { err, ok } from '../../shared/utils/result';

const PROVIDER_ID = 'ics' as const;

const fileNameFor = (title: string): string => {
  const slug = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${slug || 'event'}.ics`;
};

/** Browser download via an object URL (web only). */
const downloadOnWeb = (fileName: string, content: string): void => {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const exportIcs = async (draft: CalendarEventDraft, uid: string): Promise<Result<ExternalEventRef>> => {
  const content = buildIcsContent(draft, { uid, stamp: new Date() });
  const ref: ExternalEventRef = { provider: PROVIDER_ID, externalEventId: uid, calendarId: null };
  const fileName = fileNameFor(draft.title);

  try {
    if (Platform.OS === 'web') {
      downloadOnWeb(fileName, content);
      return ok(ref);
    }

    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(content);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/calendar',
        dialogTitle: 'Add to calendar',
      });
    }
    return ok(ref);
  } catch (e) {
    return err('unknown', 'Failed to export the .ics file.', e);
  }
};

export const icsProvider: CalendarProvider = {
  id: PROVIDER_ID,
  displayName: 'ICS Export',
  supportsSync: false,

  async ensurePermission() {
    return 'granted';
  },
  addEvent(draft) {
    return exportIcs(draft, newUuid());
  },
  updateEvent(ref, draft) {
    return exportIcs(draft, ref.externalEventId);
  },
  async removeEvent() {
    // An exported file can't be recalled; treat removal as a successful no-op.
    return ok(undefined);
  },
};
