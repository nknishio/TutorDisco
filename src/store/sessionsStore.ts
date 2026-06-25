/**
 * Sessions store. Caches sessions by id and indexes them per student. Status
 * transitions (cancel/complete) are modeled as updates so history is preserved.
 */
import { create } from 'zustand';
import { getRepositories } from '../app/di/container';
import type {
  CreateInput,
  Result,
  Session,
  SessionId,
  StudentId,
  UpdateInput,
} from '../domain/types';

interface SessionsState {
  byId: Record<string, Session>;
  byStudent: Record<string, string[]>;
  loadingStudentId: string | null;
  allLoaded: boolean;

  loadByStudent: (studentId: StudentId) => Promise<void>;
  /** Load every session (used by cross-student views like payments/revenue). */
  loadAll: () => Promise<void>;
  getById: (id: SessionId) => Session | undefined;
  forStudent: (studentId: StudentId) => Session[];
  all: () => Session[];

  create: (input: CreateInput<Session>) => Promise<Result<Session>>;
  update: (patch: UpdateInput<Session>) => Promise<Result<Session>>;
  complete: (id: SessionId) => Promise<Result<Session>>;
  cancel: (id: SessionId) => Promise<Result<Session>>;
  /** Soft-delete a session (e.g. one created by mistake). */
  remove: (id: SessionId) => Promise<Result<void>>;
}

const upsert = (state: SessionsState, session: Session): Partial<SessionsState> => {
  const ids = state.byStudent[session.studentId] ?? [];
  return {
    byId: { ...state.byId, [session.id]: session },
    byStudent: {
      ...state.byStudent,
      [session.studentId]: ids.includes(session.id) ? ids : [session.id, ...ids],
    },
  };
};

export const useSessionsStore = create<SessionsState>((set, get) => ({
  byId: {},
  byStudent: {},
  loadingStudentId: null,
  allLoaded: false,

  loadByStudent: async (studentId) => {
    set({ loadingStudentId: studentId });
    try {
      const sessions = await getRepositories().sessions.listByStudent(studentId);
      set((s) => {
        const byId = { ...s.byId };
        for (const sess of sessions) byId[sess.id] = sess;
        return {
          byId,
          byStudent: { ...s.byStudent, [studentId]: sessions.map((x) => x.id) },
        };
      });
    } finally {
      set({ loadingStudentId: null });
    }
  },

  loadAll: async () => {
    const sessions = await getRepositories().sessions.list();
    set(() => {
      const byId: Record<string, Session> = {};
      const byStudent: Record<string, string[]> = {};
      for (const sess of sessions) {
        byId[sess.id] = sess;
        (byStudent[sess.studentId] ??= []).push(sess.id);
      }
      return { byId, byStudent, allLoaded: true };
    });
  },

  getById: (id) => get().byId[id],

  forStudent: (studentId) => {
    const s = get();
    return (s.byStudent[studentId] ?? []).map((id) => s.byId[id]).filter(Boolean) as Session[];
  },

  all: () => Object.values(get().byId),

  create: async (input) => {
    const res = await getRepositories().sessions.create(input);
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  update: async (patch) => {
    const res = await getRepositories().sessions.update(patch);
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  complete: async (id) => {
    const res = await getRepositories().sessions.update({ id, status: 'completed' });
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  cancel: async (id) => {
    const res = await getRepositories().sessions.update({ id, status: 'cancelled' });
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  remove: async (id) => {
    const res = await getRepositories().sessions.softDelete(id);
    if (res.ok) {
      set((s) => {
        const byId = { ...s.byId };
        const removed = byId[id];
        delete byId[id];
        const byStudent = { ...s.byStudent };
        if (removed) {
          byStudent[removed.studentId] = (byStudent[removed.studentId] ?? []).filter((x) => x !== id);
        }
        return { byId, byStudent };
      });
    }
    return res;
  },
}));
