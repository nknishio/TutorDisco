/**
 * Checklist store. Per-session to-do items.
 */
import { create } from 'zustand';
import { getRepositories } from '../app/di/container';
import type {
  ChecklistItem,
  ChecklistItemId,
  CreateInput,
  Result,
  SessionId,
} from '../domain/types';

interface ChecklistState {
  byId: Record<string, ChecklistItem>;
  bySession: Record<string, string[]>;

  loadBySession: (sessionId: SessionId) => Promise<void>;
  forSession: (sessionId: SessionId) => ChecklistItem[];
  create: (input: CreateInput<ChecklistItem>) => Promise<Result<ChecklistItem>>;
  toggle: (id: ChecklistItemId) => Promise<Result<ChecklistItem>>;
  remove: (id: ChecklistItemId, sessionId: SessionId) => Promise<Result<void>>;
}

const upsert = (state: ChecklistState, c: ChecklistItem): Partial<ChecklistState> => {
  const ids = state.bySession[c.sessionId] ?? [];
  return {
    byId: { ...state.byId, [c.id]: c },
    bySession: {
      ...state.bySession,
      [c.sessionId]: ids.includes(c.id) ? ids : [...ids, c.id],
    },
  };
};

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  byId: {},
  bySession: {},

  loadBySession: async (sessionId) => {
    const items = await getRepositories().checklistItems.listBySession(sessionId);
    set((s) => {
      const byId = { ...s.byId };
      for (const c of items) byId[c.id] = c;
      return { byId, bySession: { ...s.bySession, [sessionId]: items.map((c) => c.id) } };
    });
  },

  forSession: (sessionId) => {
    const s = get();
    return (s.bySession[sessionId] ?? []).map((id) => s.byId[id]).filter(Boolean) as ChecklistItem[];
  },

  create: async (input) => {
    const res = await getRepositories().checklistItems.create(input);
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  toggle: async (id) => {
    const current = get().byId[id];
    if (!current) {
      return { ok: false, error: { code: 'not_found', message: 'Checklist item not found' } };
    }
    const res = await getRepositories().checklistItems.update({ id, completed: !current.completed });
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  remove: async (id, sessionId) => {
    const res = await getRepositories().checklistItems.softDelete(id);
    if (res.ok) {
      set((s) => {
        const byId = { ...s.byId };
        delete byId[id];
        return {
          byId,
          bySession: {
            ...s.bySession,
            [sessionId]: (s.bySession[sessionId] ?? []).filter((x) => x !== id),
          },
        };
      });
    }
    return res;
  },
}));
