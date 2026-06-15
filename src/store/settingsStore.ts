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
  status: LoadStatus;
  error: string | null;

  load: () => Promise<void>;
  setSatMode: (on: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  satMode: false,
  status: 'idle',
  error: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const settings = await getRepositories().settings.get();
      set({ settings, satMode: settings.satMode, status: 'ready' });
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
}));
