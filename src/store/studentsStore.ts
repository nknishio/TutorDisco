/**
 * Students store. In-memory reactive cache hydrated from the StudentRepository.
 * SQLite remains the source of truth; this store is a cache + action surface for
 * the UI (architecture.md §9).
 */
import { create } from 'zustand';
import { getRepositories } from '../app/di/container';
import type {
  CreateInput,
  Result,
  Student,
  StudentId,
  UpdateInput,
} from '../domain/types';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface StudentsState {
  byId: Record<string, Student>;
  order: string[];
  query: string;
  status: LoadStatus;
  error: string | null;

  load: () => Promise<void>;
  setQuery: (q: string) => void;
  getById: (id: StudentId) => Student | undefined;
  create: (input: CreateInput<Student>) => Promise<Result<Student>>;
  update: (patch: UpdateInput<Student>) => Promise<Result<Student>>;
  archive: (id: StudentId) => Promise<Result<Student>>;
}

const indexStudents = (students: readonly Student[]) => {
  const byId: Record<string, Student> = {};
  const order: string[] = [];
  for (const s of students) {
    byId[s.id] = s;
    order.push(s.id);
  }
  return { byId, order };
};

export const useStudentsStore = create<StudentsState>((set, get) => ({
  byId: {},
  order: [],
  query: '',
  status: 'idle',
  error: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const students = await getRepositories().students.list();
      set({ ...indexStudents(students), status: 'ready' });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  setQuery: (query) => set({ query }),

  getById: (id) => get().byId[id],

  create: async (input) => {
    const res = await getRepositories().students.create(input);
    if (res.ok) {
      set((s) => ({
        byId: { ...s.byId, [res.value.id]: res.value },
        order: [res.value.id, ...s.order],
      }));
    }
    return res;
  },

  update: async (patch) => {
    const res = await getRepositories().students.update(patch);
    if (res.ok) {
      set((s) => ({ byId: { ...s.byId, [res.value.id]: res.value } }));
    }
    return res;
  },

  archive: async (id) => {
    // Archiving is a status change — keeps history, preserves all related data.
    const res = await getRepositories().students.update({ id, status: 'archived' });
    if (res.ok) {
      set((s) => ({ byId: { ...s.byId, [res.value.id]: res.value } }));
    }
    return res;
  },
}));
