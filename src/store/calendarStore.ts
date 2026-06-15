/**
 * Calendar sync store. Orchestrates the active CalendarProvider, OS permission, and
 * the persisted Session↔event links. The scheduling UI calls these actions and never
 * touches a provider directly, so providers can be swapped without UI changes.
 *
 * Every action returns a Result and also records a human-readable `error`, so failed
 * syncs degrade gracefully (the session still saves; the calendar step just reports).
 */
import { create } from 'zustand';
import { getRepositories } from '../app/di/container';
import type {
  CalendarEventLink,
  CalendarPermissionStatus,
  CalendarProviderId,
  ExternalEventRef,
  Result,
  Session,
  SessionId,
} from '../domain/types';
import { sessionToEventDraft } from '../domain/services/calendar';
import { AVAILABLE_PROVIDERS, getCalendarProvider, DEFAULT_PROVIDER_ID } from '../integrations/calendar';
import { nowMillis } from '../shared/utils/time';
import { err, ok } from '../shared/utils/result';

/** Per-call context the pure draft builder needs. */
export interface SyncContext {
  studentName: string;
  satMode: boolean;
}

/** Provider metadata for the scheduling UI — so it never imports the provider registry. */
export const CALENDAR_PROVIDER_OPTIONS: readonly {
  id: CalendarProviderId;
  label: string;
  supportsSync: boolean;
}[] = AVAILABLE_PROVIDERS.map((p) => ({ id: p.id, label: p.displayName, supportsSync: p.supportsSync }));

interface CalendarState {
  /** Provider selected for new events. Existing events sync via their own link.provider. */
  providerId: CalendarProviderId;
  /** sessionId → link (null once loaded with no link; undefined = not yet loaded). */
  linksBySession: Record<string, CalendarEventLink | null>;
  permission: CalendarPermissionStatus | null;
  busySessionId: string | null;
  error: string | null;

  setProvider: (id: CalendarProviderId) => void;
  loadLink: (sessionId: SessionId) => Promise<void>;
  getLink: (sessionId: SessionId) => CalendarEventLink | null | undefined;

  /** Add the session to the selected provider. Resolves to the saved link, or null for one-shot providers (ICS). */
  addToCalendar: (session: Session, ctx: SyncContext) => Promise<Result<CalendarEventLink | null>>;
  /** If the session is already linked, push updated details to that provider. */
  syncOnEdit: (session: Session, ctx: SyncContext) => Promise<void>;
  /** Remove the linked event and clear the link. */
  removeFromCalendar: (session: Session) => Promise<Result<void>>;
}

const refOf = (link: CalendarEventLink): ExternalEventRef => ({
  provider: link.provider,
  externalEventId: link.externalEventId,
  calendarId: link.calendarId,
});

const permissionMessage = (status: CalendarPermissionStatus): string =>
  status === 'denied'
    ? 'Calendar access is denied. Enable it in Settings to sync sessions.'
    : 'The calendar is unavailable on this platform.';

export const useCalendarStore = create<CalendarState>((set, get) => ({
  providerId: DEFAULT_PROVIDER_ID,
  linksBySession: {},
  permission: null,
  busySessionId: null,
  error: null,

  setProvider: (id) => set({ providerId: id, error: null }),

  loadLink: async (sessionId) => {
    const link = await getRepositories().calendarLinks.getActiveForSession(sessionId);
    set((s) => ({ linksBySession: { ...s.linksBySession, [sessionId]: link } }));
  },

  getLink: (sessionId) => get().linksBySession[sessionId],

  addToCalendar: async (session, ctx) => {
    const provider = getCalendarProvider(get().providerId);
    if (!provider) return err('unknown', 'That calendar provider is not available.');

    set({ busySessionId: session.id, error: null });
    try {
      const permission = await provider.ensurePermission();
      set({ permission });
      if (permission !== 'granted') {
        const message = permissionMessage(permission);
        set({ error: message });
        return err('unknown', message);
      }

      const draft = sessionToEventDraft({ session, studentName: ctx.studentName, satMode: ctx.satMode });
      const added = await provider.addEvent(draft);
      if (!added.ok) {
        set({ error: added.error.message });
        return added;
      }

      // One-shot providers (ICS) don't keep an updatable event — nothing to persist.
      if (!provider.supportsSync) return ok(null);

      const ref = added.value;
      const created = await getRepositories().calendarLinks.create({
        sessionId: session.id,
        provider: ref.provider,
        externalEventId: ref.externalEventId,
        calendarId: ref.calendarId,
        title: draft.title,
        syncedAt: nowMillis(),
      });
      if (!created.ok) {
        set({ error: created.error.message });
        return created;
      }
      set((s) => ({ linksBySession: { ...s.linksBySession, [session.id]: created.value } }));
      return ok(created.value);
    } finally {
      set({ busySessionId: null });
    }
  },

  syncOnEdit: async (session, ctx) => {
    const cached = get().linksBySession[session.id];
    const link = cached ?? (await getRepositories().calendarLinks.getActiveForSession(session.id));
    if (!link) return; // not on the calendar — nothing to update

    const provider = getCalendarProvider(link.provider);
    if (!provider || !provider.supportsSync) return;

    set({ busySessionId: session.id, error: null });
    try {
      const permission = await provider.ensurePermission();
      set({ permission });
      if (permission !== 'granted') {
        set({ error: permissionMessage(permission) });
        return;
      }

      const draft = sessionToEventDraft({ session, studentName: ctx.studentName, satMode: ctx.satMode });
      const updated = await provider.updateEvent(refOf(link), draft);
      if (!updated.ok) {
        set({ error: updated.error.message });
        return;
      }
      const saved = await getRepositories().calendarLinks.update({
        id: link.id,
        title: draft.title,
        syncedAt: nowMillis(),
      });
      if (saved.ok) {
        set((s) => ({ linksBySession: { ...s.linksBySession, [session.id]: saved.value } }));
      }
    } finally {
      set({ busySessionId: null });
    }
  },

  removeFromCalendar: async (session) => {
    const cached = get().linksBySession[session.id];
    const link = cached ?? (await getRepositories().calendarLinks.getActiveForSession(session.id));
    if (!link) return ok(undefined); // already not linked

    const provider = getCalendarProvider(link.provider);
    set({ busySessionId: session.id, error: null });
    try {
      if (provider) {
        const removed = await provider.removeEvent(refOf(link));
        if (!removed.ok) {
          set({ error: removed.error.message });
          return removed;
        }
      }
      await getRepositories().calendarLinks.softDelete(link.id);
      set((s) => ({ linksBySession: { ...s.linksBySession, [session.id]: null } }));
      return ok(undefined);
    } finally {
      set({ busySessionId: null });
    }
  },
}));
