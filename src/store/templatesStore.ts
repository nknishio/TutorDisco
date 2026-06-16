/**
 * Email templates store. In-memory reactive cache over the EmailTemplateRepository.
 * Defaults are seeded at data-layer init, so a fresh load already includes them.
 */
import { create } from 'zustand';
import { getRepositories } from '../app/di/container';
import type {
  CreateInput,
  EmailTemplate,
  EmailTemplateId,
  Result,
  UpdateInput,
} from '../domain/types';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TemplatesState {
  byId: Record<string, EmailTemplate>;
  order: string[];
  status: LoadStatus;
  error: string | null;

  load: () => Promise<void>;
  list: () => EmailTemplate[];
  getById: (id: EmailTemplateId) => EmailTemplate | undefined;
  create: (input: CreateInput<EmailTemplate>) => Promise<Result<EmailTemplate>>;
  update: (patch: UpdateInput<EmailTemplate>) => Promise<Result<EmailTemplate>>;
  remove: (id: EmailTemplateId) => Promise<Result<void>>;
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  byId: {},
  order: [],
  status: 'idle',
  error: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const templates = await getRepositories().emailTemplates.list();
      const byId: Record<string, EmailTemplate> = {};
      const order: string[] = [];
      for (const t of templates) {
        byId[t.id] = t;
        order.push(t.id);
      }
      set({ byId, order, status: 'ready' });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  list: () => {
    const s = get();
    return s.order.map((id) => s.byId[id]).filter(Boolean) as EmailTemplate[];
  },

  getById: (id) => get().byId[id],

  create: async (input) => {
    const res = await getRepositories().emailTemplates.create(input);
    if (res.ok) {
      set((s) => ({
        byId: { ...s.byId, [res.value.id]: res.value },
        order: [res.value.id, ...s.order],
      }));
    }
    return res;
  },

  update: async (patch) => {
    const res = await getRepositories().emailTemplates.update(patch);
    if (res.ok) set((s) => ({ byId: { ...s.byId, [res.value.id]: res.value } }));
    return res;
  },

  remove: async (id) => {
    const res = await getRepositories().emailTemplates.softDelete(id);
    if (res.ok) {
      set((s) => {
        const byId = { ...s.byId };
        delete byId[id];
        return { byId, order: s.order.filter((x) => x !== id) };
      });
    }
    return res;
  },
}));
