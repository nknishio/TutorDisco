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
  SessionId,
  StudentId,
  UpdateInput,
} from '../domain/types';
import { paymentForSession } from '../domain/services/payments';
import { err } from '../shared/utils/result';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface PaymentsState {
  byId: Record<string, Payment>;
  order: string[];
  status: LoadStatus;
  error: string | null;

  loadAll: () => Promise<void>;
  /** Load the payments for one student (merges into the cache). */
  loadByStudent: (studentId: StudentId) => Promise<void>;
  all: () => Payment[];
  forStudent: (studentId: StudentId) => Payment[];
  forSession: (sessionId: SessionId) => Payment[];

  create: (input: CreateInput<Payment>) => Promise<Result<Payment>>;
  update: (patch: UpdateInput<Payment>) => Promise<Result<Payment>>;
  /** Create a pending payment for a session with an auto-calculated amount. */
  billSession: (session: Session) => Promise<Result<Payment>>;
  markPaid: (id: PaymentId, receivedDate: IsoDate) => Promise<Result<Payment>>;
  /** Mark a session's payment paid, billing it first if none exists yet. */
  markSessionPaid: (session: Session, receivedDate: IsoDate) => Promise<Result<Payment>>;
  /** Revert a session's paid payment back to pending (e.g. marked paid by mistake). */
  markSessionUnpaid: (sessionId: SessionId) => Promise<Result<Payment>>;
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

  loadByStudent: async (studentId) => {
    set({ status: 'loading', error: null });
    try {
      const payments = await getRepositories().payments.listByStudent(studentId);
      set((s) => {
        const byId = { ...s.byId };
        const order = [...s.order];
        for (const p of payments) {
          byId[p.id] = p;
          if (!order.includes(p.id)) order.push(p.id);
        }
        return { byId, order, status: 'ready' };
      });
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

  forSession: (sessionId) =>
    get()
      .all()
      .filter((p) => p.sessionId === sessionId),

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

  markSessionPaid: async (session, receivedDate) => {
    const existing = get().forSession(session.id)[0];
    if (existing) return get().markPaid(existing.id, receivedDate);
    const billed = await get().billSession(session);
    if (!billed.ok) return billed;
    return get().markPaid(billed.value.id, receivedDate);
  },

  markSessionUnpaid: async (sessionId) => {
    const paid = get().forSession(sessionId).find((p) => p.status === 'paid');
    if (!paid) return err('not_found', 'No paid payment to revert for this session.');
    return get().markPending(paid.id);
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
