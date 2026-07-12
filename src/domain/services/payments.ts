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
import { sessionPaymentCents } from './earnings';

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
export const revenuePerStudent = (payments: readonly Payment[]): StudentRevenue[] => {
  const map = new Map<string, { paid: number; outstanding: number }>();
  for (const p of payments) {
    if (p.status === 'cancelled') continue;
    const b = map.get(p.studentId) ?? { paid: 0, outstanding: 0 };
    if (p.status === 'paid') b.paid += p.amount;
    else b.outstanding += p.amount; // pending + overdue
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
