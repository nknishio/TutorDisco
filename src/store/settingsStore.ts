/**
 * Settings store. Caches the singleton AppSettings and exposes the global SAT Mode
 * toggle, which drives calendar event titles ("{Name} SAT Tutor" vs "{Name} Tutoring").
 */
import { create } from 'zustand';
import { getRepositories } from '../app/di/container';
import type { AppSettings } from '../domain/types';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SettingsState {
  settings: AppSettings | null;
  satMode: boolean;
  /** App-wide default checklist items offered when creating a session. */
  defaultChecklistItems: string[];
  /** App-wide default calendar reminders (minutes before start) for new sessions. */
  defaultCalendarAlerts: number[];
  status: LoadStatus;
  error: string | null;

  load: () => Promise<void>;
  setSatMode: (on: boolean) => Promise<void>;
  setDefaultChecklistItems: (items: readonly string[]) => Promise<void>;
  setDefaultCalendarAlerts: (alerts: readonly number[]) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  satMode: false,
  defaultChecklistItems: [],
  defaultCalendarAlerts: [],
  status: 'idle',
  error: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const settings = await getRepositories().settings.get();
      set({
        settings,
        satMode: settings.satMode,
        defaultChecklistItems: [...settings.defaultChecklistItems],
        defaultCalendarAlerts: [...settings.defaultCalendarAlerts],
        status: 'ready',
      });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  setSatMode: async (on) => {
    // Optimistic — reflect immediately, reconcile from the persisted row.
    set({ satMode: on });
    const res = await getRepositories().settings.update({ satMode: on });
    if (res.ok) set({ settings: res.value, satMode: res.value.satMode });
    else set((s) => ({ satMode: s.settings?.satMode ?? false, error: res.error.message }));
  },

  setDefaultChecklistItems: async (items) => {
    const next = [...items];
    // Optimistic — reflect immediately, reconcile from the persisted row.
    set({ defaultChecklistItems: next });
    const res = await getRepositories().settings.update({ defaultChecklistItems: next });
    if (res.ok) {
      set({ settings: res.value, defaultChecklistItems: [...res.value.defaultChecklistItems] });
    } else {
      set((s) => ({
        defaultChecklistItems: [...(s.settings?.defaultChecklistItems ?? [])],
        error: res.error.message,
      }));
    }
  },

  setDefaultCalendarAlerts: async (alerts) => {
    const next = [...alerts].sort((a, b) => a - b);
    // Optimistic — reflect immediately, reconcile from the persisted row.
    set({ defaultCalendarAlerts: next });
    const res = await getRepositories().settings.update({ defaultCalendarAlerts: next });
    if (res.ok) {
      set({ settings: res.value, defaultCalendarAlerts: [...res.value.defaultCalendarAlerts] });
    } else {
      set((s) => ({
        defaultCalendarAlerts: [...(s.settings?.defaultCalendarAlerts ?? [])],
        error: res.error.message,
      }));
    }
  },
}));
