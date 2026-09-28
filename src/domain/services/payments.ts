/**
 * Payments / revenue domain service. Pure functions — no I/O, no framework.
 *
 * A payment's amount is auto-calculated from the session it covers: the snapshot
 * hourly rate prorated by duration (see earnings.ts). Revenue analytics aggregate
 * the resulting payment rows: collected (paid) vs. outstanding (pending + overdue),
 * monthly collected revenue, and revenue per student. Money is integer cents.
 */
import type { Cents, CreateInput, IsoDate, StudentId } from '../types/common';
import type { Payment, PaymentStatus } from '../types/payment';
import type { Session } from '../types/session';
import { sessionPaymentCents, studentAccount } from './earnings';

/**
 * Build the create-payload for a pending payment covering a session. The amount is
 * computed automatically as hourly rate × (duration / 60), so the tutor never types it.
 */
export const paymentForSession = (session: Session): CreateInput<Payment> => ({
  studentId: session.studentId,
  sessionId: session.id,
  amount: sessionPaymentCents(session),
  status: 'pending',
  receivedDate: null,
});

// ---------------------------------------------------------------------------
// Sorting (payments table)
// ---------------------------------------------------------------------------
export type PaymentSortColumn = 'student' | 'session' | 'amount' | 'status' | 'received';

export interface PaymentSort {
  readonly columnId: PaymentSortColumn;
  /** 'desc' = the first press (down arrow); 'asc' = reversed (up arrow). */
  readonly dir: 'asc' | 'desc';
}

export interface PaymentSortAccessors {
  /** Display name of the payment's student, for the Student column. */
  studentName: (p: Payment) => string;
  /** The covered session's date ('YYYY-MM-DD'), or null for ad-hoc payments. */
  sessionDate: (p: Payment) => string | null;
}

/** Default table order: pending first, then overdue, then paid, then cancelled. */
const STATUS_RANK: Record<PaymentStatus, number> = { pending: 0, overdue: 1, paid: 2, cancelled: 3 };

/**
 * Order payments for the table. When `sort` is null this is the default arrangement —
 * unpaid on top (pending, then overdue) and paid sorted by received date, latest first.
 * When a column sort is active, rows with no value for that column (ad-hoc session,
 * unpaid received date) sink to the bottom in both directions. Returns a new array.
 */
export const sortPayments = (
  payments: readonly Payment[],
  sort: PaymentSort | null,
  acc: PaymentSortAccessors,
): Payment[] => {
  if (!sort) {
    return [...payments].sort((a, b) => {
      const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (r !== 0) return r;
      // Within the paid group: latest received first.
      if (a.status === 'paid') return (b.receivedDate ?? '').localeCompare(a.receivedDate ?? '');
      return 0; // stable for the rest
    });
  }

  const missing = (p: Payment): boolean =>
    (sort.columnId === 'session' && acc.sessionDate(p) == null) ||
    (sort.columnId === 'received' && p.receivedDate == null);

  const present: Payment[] = [];
  const absent: Payment[] = [];
  for (const p of payments) (missing(p) ? absent : present).push(p);

  const asc = (a: Payment, b: Payment): number => {
    switch (sort.columnId) {
      case 'student':
        return acc.studentName(a).localeCompare(acc.studentName(b));
      case 'amount':
        return a.amount - b.amount;
      case 'status':
        return STATUS_RANK[a.status] - STATUS_RANK[b.status];
      case 'session':
        return (acc.sessionDate(a) ?? '').localeCompare(acc.sessionDate(b) ?? '');
      case 'received':
        return (a.receivedDate ?? '').localeCompare(b.receivedDate ?? '');
    }
  };

  present.sort((a, b) => asc(a, b) || acc.studentName(a).localeCompare(acc.studentName(b)));
  if (sort.dir === 'desc') present.reverse();
  return [...present, ...absent];
};

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------
export interface PaymentTotals {
  /** Collected: sum over paid payments. This is recognized revenue. */
  readonly paidCents: Cents;
  /** Awaiting payment (status 'pending'). */
  readonly pendingCents: Cents;
  /** Past due (status 'overdue'). */
  readonly overdueCents: Cents;
  readonly paidCount: number;
  readonly pendingCount: number;
  readonly overdueCount: number;
  /** Pending + overdue — money still owed. */
  readonly outstandingCents: Cents;
}

/** Aggregate payments into collected / outstanding totals. Cancelled rows are ignored. */
export const paymentTotals = (payments: readonly Payment[]): PaymentTotals => {
  const t = payments.reduce(
    (acc, p) => {
      if (p.status === 'paid') {
        acc.paidCents += p.amount;
        acc.paidCount += 1;
      } else if (p.status === 'pending') {
        acc.pendingCents += p.amount;
        acc.pendingCount += 1;
      } else if (p.status === 'overdue') {
        acc.overdueCents += p.amount;
        acc.overdueCount += 1;
      }
      // cancelled contributes nothing.
      return acc;
    },
    {
      paidCents: 0,
      pendingCents: 0,
      overdueCents: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
    },
  );
  return {
    paidCents: t.paidCents as Cents,
    pendingCents: t.pendingCents as Cents,
    overdueCents: t.overdueCents as Cents,
    paidCount: t.paidCount,
    pendingCount: t.pendingCount,
    overdueCount: t.overdueCount,
    outstandingCents: (t.pendingCents + t.overdueCents) as Cents,
  };
};

// ---------------------------------------------------------------------------
// Outstanding: what an unpaid payment really represents
// ---------------------------------------------------------------------------

/** Why an unpaid (pending/overdue) payment is — or isn't — money still owed. */
export type PaymentStandingReason =
  /** Billed for a completed session and not covered: owed in full. */
  | 'owed'
  /** Its completed session is fully covered by prepaid credit. */
  | 'prepaid'
  /** Its completed session is partly covered by prepaid credit; the rest is owed. */
  | 'partial'
  /** No session: a requested prepayment — not yet received, not yet earned. */
  | 'requested'
  /** Its session was changed back to scheduled, cancelled or no-show. */
  | 'not_completed'
  /** Its session no longer exists (deleted). */
  | 'no_session'
  /** A $0 bill: nothing is owed. */
  | 'nothing_due';

export interface PaymentStanding {
  readonly reason: PaymentStandingReason;
  /** The part of the payment that is actually owed (0 unless 'owed' or 'partial'). */
  readonly outstandingCents: Cents;
}

/**
 * For every pending/overdue payment, how much of it is really owed — the same rules
 * the student page uses (`studentAccount`): only completed sessions are owed, net of
 * prepaid credit. Keyed by payment id; paid/cancelled payments are absent.
 *
 * `sessionsComplete` says `sessions` holds every session, so a payment whose session
 * is missing was deleted. When false (still loading), such payments count as owed
 * rather than being mislabelled.
 */
export const standingByPayment = (
  payments: readonly Payment[],
  sessions: readonly Session[],
  { sessionsComplete }: { sessionsComplete: boolean },
): ReadonlyMap<string, PaymentStanding> => {
  const sessionsById = new Map(sessions.map((s) => [s.id as string, s]));
  const sessionsByStudent = new Map<string, Session[]>();
  for (const s of sessions) sessionsByStudent.set(s.studentId, [...(sessionsByStudent.get(s.studentId) ?? []), s]);
  const paymentsByStudent = new Map<string, Payment[]>();
  for (const p of payments) paymentsByStudent.set(p.studentId, [...(paymentsByStudent.get(p.studentId) ?? []), p]);

  const out = new Map<string, PaymentStanding>();
  const set = (p: Payment, reason: PaymentStandingReason, outstanding: number) =>
    out.set(p.id, { reason, outstandingCents: Math.max(0, outstanding) as Cents });

  for (const [studentId, studentPayments] of paymentsByStudent) {
    const account = studentAccount(sessionsByStudent.get(studentId) ?? [], studentPayments);
    for (const p of studentPayments) {
      if (p.status !== 'pending' && p.status !== 'overdue') continue;
      if (p.amount === 0) {
        set(p, 'nothing_due', 0);
        continue;
      }
      if (p.sessionId == null) {
        set(p, 'requested', 0);
        continue;
      }
      const session = sessionsById.get(p.sessionId);
      if (!session) {
        if (sessionsComplete) set(p, 'no_session', 0);
        else set(p, 'owed', p.amount);
        continue;
      }
      if (session.status !== 'completed') {
        set(p, 'not_completed', 0);
        continue;
      }
      const applied = account.settlements.get(p.sessionId)?.creditAppliedCents ?? 0;
      if (applied >= p.amount) set(p, 'prepaid', 0);
      else if (applied > 0) set(p, 'partial', p.amount - applied);
      else set(p, 'owed', p.amount);
    }
  }
  return out;
};

/**
 * `paymentTotals` counting only what's really owed (see `standingByPayment`): prepaid,
 * requested, not-completed and orphaned amounts leave pending/overdue and the counts.
 * Collected is unchanged.
 */
export const netPaymentTotals = (
  payments: readonly Payment[],
  standing: ReadonlyMap<string, PaymentStanding>,
): PaymentTotals => {
  const gross = paymentTotals(payments);
  let pending = 0;
  let overdue = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  for (const p of payments) {
    if (p.status !== 'pending' && p.status !== 'overdue') continue;
    const owed = standing.get(p.id)?.outstandingCents ?? p.amount;
    if (owed <= 0) continue;
    if (p.status === 'pending') {
      pending += owed;
      pendingCount += 1;
    } else {
      overdue += owed;
      overdueCount += 1;
    }
  }
  return {
    ...gross,
    pendingCents: pending as Cents,
    overdueCents: overdue as Cents,
    pendingCount,
    overdueCount,
    outstandingCents: (pending + overdue) as Cents,
  };
};

// ---------------------------------------------------------------------------
// Monthly revenue (collected)
// ---------------------------------------------------------------------------
/** 'YYYY-MM' month bucket of an IsoDate. */
export const monthKeyOf = (date: IsoDate | string): string => date.slice(0, 7);

export interface MonthlyRevenue {
  /** 'YYYY-MM'. */
  readonly month: string;
  /** Collected (paid) in this month, by received date. */
  readonly paidCents: Cents;
  readonly count: number;
}

/**
 * Collected revenue grouped by the month money was received. Only paid payments with a
 * received date count. Returns a lookup keyed by 'YYYY-MM' so callers can render any
 * window (e.g. the last 6 months) without worrying about gaps.
 */
export const monthlyRevenueMap = (payments: readonly Payment[]): Map<string, MonthlyRevenue> => {
  const map = new Map<string, { paidCents: number; count: number }>();
  for (const p of payments) {
    if (p.status !== 'paid' || p.receivedDate == null) continue;
    const key = monthKeyOf(p.receivedDate);
    const b = map.get(key) ?? { paidCents: 0, count: 0 };
    b.paidCents += p.amount;
    b.count += 1;
    map.set(key, b);
  }
  const out = new Map<string, MonthlyRevenue>();
  for (const [month, b] of map) {
    out.set(month, { month, paidCents: b.paidCents as Cents, count: b.count });
  }
  return out;
};

/** Collected revenue for a single 'YYYY-MM' month. */
export const revenueForMonth = (payments: readonly Payment[], monthKey: string): Cents =>
  (monthlyRevenueMap(payments).get(monthKey)?.paidCents ?? 0) as Cents;

// ---------------------------------------------------------------------------
// Revenue per student
// ---------------------------------------------------------------------------
export interface StudentRevenue {
  readonly studentId: StudentId;
  readonly paidCents: Cents;
  readonly outstandingCents: Cents;
  /** Paid + outstanding — total billed to this student. */
  readonly billedCents: Cents;
}

/** Per-student revenue, sorted by total billed descending. */
export const revenuePerStudent = (
  payments: readonly Payment[],
  /** Real standing of unpaid payments (see standingByPayment); only the owed part counts. */
  standing?: ReadonlyMap<string, PaymentStanding>,
): StudentRevenue[] => {
  const map = new Map<string, { paid: number; outstanding: number }>();
  for (const p of payments) {
    if (p.status === 'cancelled') continue;
    const b = map.get(p.studentId) ?? { paid: 0, outstanding: 0 };
    if (p.status === 'paid') b.paid += p.amount;
    else b.outstanding += standing?.get(p.id)?.outstandingCents ?? p.amount; // pending + overdue, only what's owed
    map.set(p.studentId, b);
  }
  return [...map.entries()]
    .map(([studentId, b]) => ({
      studentId: studentId as StudentId,
      paidCents: b.paid as Cents,
      outstandingCents: b.outstanding as Cents,
      billedCents: (b.paid + b.outstanding) as Cents,
    }))
    .sort((a, b) => b.billedCents - a.billedCents);
};
