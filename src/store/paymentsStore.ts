/**
 * Payments store. In-memory reactive cache hydrated from the PaymentRepository.
 * SQLite remains the source of truth; this store is a cache + action surface for the
 * UI (architecture.md §9). Status transitions (mark paid / pending) are modeled as
 * updates so history is preserved, mirroring the sessions store.
 */
import { create } from 'zustand';
import { getRepositories } from '../app/di/container';
import type {
  CreateInput,
  IsoDate,
  Payment,
  PaymentId,
  Result,
  Session,
  StudentId,
  UpdateInput,
} from '../domain/types';
import { paymentForSession } from '../domain/services/payments';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface PaymentsState {
  byId: Record<string, Payment>;
  order: string[];
  status: LoadStatus;
  error: string | null;

  loadAll: () => Promise<void>;
  all: () => Payment[];
  forStudent: (studentId: StudentId) => Payment[];

  create: (input: CreateInput<Payment>) => Promise<Result<Payment>>;
  update: (patch: UpdateInput<Payment>) => Promise<Result<Payment>>;
  /** Create a pending payment for a session with an auto-calculated amount. */
  billSession: (session: Session) => Promise<Result<Payment>>;
  markPaid: (id: PaymentId, receivedDate: IsoDate) => Promise<Result<Payment>>;
  markPending: (id: PaymentId) => Promise<Result<Payment>>;
  remove: (id: PaymentId) => Promise<Result<void>>;
}

const upsert = (state: PaymentsState, payment: Payment): Partial<PaymentsState> => ({
  byId: { ...state.byId, [payment.id]: payment },
  order: state.order.includes(payment.id) ? state.order : [payment.id, ...state.order],
});

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  byId: {},
  order: [],
  status: 'idle',
  error: null,

  loadAll: async () => {
    set({ status: 'loading', error: null });
    try {
      const payments = await getRepositories().payments.list();
      const byId: Record<string, Payment> = {};
      const order: string[] = [];
      for (const p of payments) {
        byId[p.id] = p;
        order.push(p.id);
      }
      set({ byId, order, status: 'ready' });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  all: () => {
    const s = get();
    return s.order.map((id) => s.byId[id]).filter(Boolean) as Payment[];
  },

  forStudent: (studentId) =>
    get()
      .all()
      .filter((p) => p.studentId === studentId),

  create: async (input) => {
    const res = await getRepositories().payments.create(input);
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  update: async (patch) => {
    const res = await getRepositories().payments.update(patch);
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  billSession: async (session) => {
    const res = await getRepositories().payments.create(paymentForSession(session));
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  markPaid: async (id, receivedDate) => {
    const res = await getRepositories().payments.update({ id, status: 'paid', receivedDate });
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  markPending: async (id) => {
    const res = await getRepositories().payments.update({ id, status: 'pending', receivedDate: null });
    if (res.ok) set((s) => upsert(s, res.value));
    return res;
  },

  remove: async (id) => {
    const res = await getRepositories().payments.softDelete(id);
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
