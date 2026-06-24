/**
 * Assignments store. Indexed per session.
 */
import { create } from 'zustand';
import { getRepositories } from '../app/di/container';
import type {
  Assignment,
  AssignmentId,
  CreateInput,
  Result,
  SessionId,
  UpdateInput,
} from '../domain/types';

interface AssignmentsState {
  byId: Record<string, Assignment>;
  bySession: Record<string, string[]>;

  loadBySession: (sessionId: SessionId) => Promise<void>;
  /** Load assignments for many sessions in one batch (one state update). */
  loadForSessions: (sessionIds: readonly SessionId[]) => Promise<void>;
  forSession: (sessionId: SessionId) => Assignment[];
  create: (input: CreateInput<Assignment>) => Promise<Result<Assignment>>;
  update: (patch: UpdateInput<Assignment>) => Promise<Result<Assignment>>;
  setComplete: (id: AssignmentId, complete: boolean) => Promise<Result<Assignment>>;
  remove: (id: AssignmentId, sessionId: SessionId) => Promise<Result<void>>;
}

const upsert = (state: AssignmentsState, a: Assignment): Partial<AssignmentsState> => {
  const ids = state.bySession[a.sessionId] ?? [];
  return {
    byId: { ...state.byId, [a.id]: a },
    bySession: {
      ...state.bySession,
      [a.sessionId]: ids.includes(a.id) ? ids : [...ids, a.id],
    },
  };
};

export const useAssignmentsStore = create<AssignmentsState>((set, get) => ({
  byId: {},
  bySession: {},

  loadBySession: async (sessionId) => {
    const items = await getRepositories().assignments.listBySession(sessionId);
    set((s) => {
      const byId = { ...s.byId };
      for (const a of items) byId[a.id] = a;
      return { byId, bySession: { ...s.bySession, [sessionId]: items.map((a) => a.id) } };
    });
  },

  loadForSessions: async (sessionIds) => {
    if (sessionIds.length === 0) return;
    const repo = getRepositories().assignments;
    const loaded = await Promise.all(
      sessionIds.map(async (id) => [id, await repo.listBySession(id)] as const),
    );
    set((s) => {
      const byId = { ...s.byId };
      const bySession = { ...s.bySession };
      for (const [sessionId, items] of loaded) {
        for (const a of items) byId[a.id] = a;
        bySession[sessionId] = items.map((a) => a.id);
      }
      return { byId, bySession };
    });
  },

  forSession: (sessionId) => {
    const s = get();
    return (s.bySession[sessionId] ?? []).map((id) => s.byId[id]).filter(Boolean) as Assignment[];
  },

  create: async (input) => {
    const res = await getRepositories().assignments.create(input);
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  update: async (patch) => {
    const res = await getRepositories().assignments.update(patch);
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  setComplete: async (id, complete) => {
    const res = await getRepositories().assignments.update({
      id,
      status: complete ? 'completed' : 'pending',
    });
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  remove: async (id, sessionId) => {
    const res = await getRepositories().assignments.softDelete(id);
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
