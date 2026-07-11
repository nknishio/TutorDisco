/**
 * Settings store. Caches the singleton AppSettings and exposes the global SAT Mode
 * toggle, which drives calendar event titles ("{Name} SAT Tutor" vs "{Name} Tutoring").
 */
import { create } from 'zustand';
import { getRepositories } from '../app/di/container';
import type {
  AppSettings,
  StudentSortDir,
  StudentSortKey,
  ThemePreference,
} from '../domain/types';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SettingsState {
  settings: AppSettings | null;
  satMode: boolean;
  theme: ThemePreference;
  /** App-wide default checklist items offered when creating a session. */
  defaultChecklistItems: string[];
  /** App-wide default calendar reminders (minutes before start) for new sessions. */
  defaultCalendarAlerts: number[];
  /** Active students-list sort key. */
  studentSortKey: StudentSortKey;
  /** Direction applied to the active students-list sort key. */
  studentSortDir: StudentSortDir;
  /** Hand-arranged custom student order (student ids). Preserved across sort changes. */
  studentCustomOrder: string[];
  /** Hand-arranged email-template order (template ids). Drives Templates + email dropdown. */
  emailTemplateOrder: string[];
  status: LoadStatus;
  error: string | null;

  load: () => Promise<void>;
  setSatMode: (on: boolean) => Promise<void>;
  setTheme: (preference: ThemePreference) => Promise<void>;
  setDefaultChecklistItems: (items: readonly string[]) => Promise<void>;
  setDefaultCalendarAlerts: (alerts: readonly number[]) => Promise<void>;
  setStudentSort: (key: StudentSortKey, dir: StudentSortDir) => Promise<void>;
  setStudentCustomOrder: (ids: readonly string[]) => Promise<void>;
  setEmailTemplateOrder: (ids: readonly string[]) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  satMode: false,
  theme: 'system',
  defaultChecklistItems: [],
  defaultCalendarAlerts: [],
  studentSortKey: 'custom',
  studentSortDir: 'asc',
  studentCustomOrder: [],
  emailTemplateOrder: [],
  status: 'idle',
  error: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const settings = await getRepositories().settings.get();
      set({
        settings,
        satMode: settings.satMode,
        theme: settings.theme,
        defaultChecklistItems: [...settings.defaultChecklistItems],
        defaultCalendarAlerts: [...settings.defaultCalendarAlerts],
        studentSortKey: settings.studentSortKey,
        studentSortDir: settings.studentSortDir,
        studentCustomOrder: [...settings.studentCustomOrder],
        emailTemplateOrder: [...settings.emailTemplateOrder],
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

  setTheme: async (preference) => {
    set({ theme: preference });
    const res = await getRepositories().settings.update({ theme: preference });
    if (res.ok) set({ settings: res.value, theme: res.value.theme });
    else set((s) => ({ theme: s.settings?.theme ?? 'system', error: res.error.message }));
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

  setStudentSort: async (key, dir) => {
    // Optimistic — reflect immediately, reconcile from the persisted row.
    set({ studentSortKey: key, studentSortDir: dir });
    const res = await getRepositories().settings.update({ studentSortKey: key, studentSortDir: dir });
    if (res.ok) {
      set({ settings: res.value, studentSortKey: res.value.studentSortKey, studentSortDir: res.value.studentSortDir });
    } else {
      set((s) => ({
        studentSortKey: s.settings?.studentSortKey ?? 'custom',
        studentSortDir: s.settings?.studentSortDir ?? 'asc',
        error: res.error.message,
      }));
    }
  },

  setStudentCustomOrder: async (ids) => {
    const next = [...ids];
    // Optimistic — reflect immediately, reconcile from the persisted row.
    set({ studentCustomOrder: next });
    const res = await getRepositories().settings.update({ studentCustomOrder: next });
    if (res.ok) {
      set({ settings: res.value, studentCustomOrder: [...res.value.studentCustomOrder] });
    } else {
      set((s) => ({
        studentCustomOrder: [...(s.settings?.studentCustomOrder ?? [])],
        error: res.error.message,
      }));
    }
  },

  setEmailTemplateOrder: async (ids) => {
    const next = [...ids];
    // Optimistic — reflect immediately, reconcile from the persisted row.
    set({ emailTemplateOrder: next });
    const res = await getRepositories().settings.update({ emailTemplateOrder: next });
    if (res.ok) {
      set({ settings: res.value, emailTemplateOrder: [...res.value.emailTemplateOrder] });
    } else {
      set((s) => ({
        emailTemplateOrder: [...(s.settings?.emailTemplateOrder ?? [])],
        error: res.error.message,
      }));
    }
  },
}));
