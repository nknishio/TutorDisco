/**
 * Earnings / billing domain service. Pure functions — no I/O, no framework.
 *
 * Money is integer cents throughout. Expected payment for a session is the snapshot
 * hourly rate prorated by duration. Revenue is split by session status so the UI can
 * show earned (completed) vs. projected (scheduled) separately.
 */
import type { Cents } from '../types/common';
import type { Payment } from '../types/payment';
import type { Session } from '../types/session';

/** Prorated payment for a single session: rate × (minutes / 60), rounded to the cent. */
export const expectedPaymentCents = (
  hourlyRateCents: Cents,
  durationMinutes: number,
): Cents => Math.round((hourlyRateCents * durationMinutes) / 60) as Cents;

/** Convenience overload for a whole session. */
export const sessionPaymentCents = (session: Pick<Session, 'hourlyRate' | 'duration'>): Cents =>
  expectedPaymentCents(session.hourlyRate, session.duration);

export interface RevenueSummary {
  /** Earned: sum over completed sessions. */
  readonly completedCents: Cents;
  /** Projected: sum over still-scheduled sessions. */
  readonly scheduledCents: Cents;
  readonly completedCount: number;
  readonly scheduledCount: number;
  /** Total minutes taught (completed sessions only). */
  readonly completedMinutes: number;
}

const ZERO: RevenueSummary = {
  completedCents: 0 as Cents,
  scheduledCents: 0 as Cents,
  completedCount: 0,
  scheduledCount: 0,
  completedMinutes: 0,
};

/** Aggregate a set of sessions into an earned/projected summary. */
export const revenueSummary = (sessions: readonly Session[]): RevenueSummary =>
  sessions.reduce<RevenueSummary>((acc, s) => {
    const pay = sessionPaymentCents(s);
    if (s.status === 'completed') {
      return {
        ...acc,
        completedCents: (acc.completedCents + pay) as Cents,
        completedCount: acc.completedCount + 1,
        completedMinutes: acc.completedMinutes + s.duration,
      };
    }
    if (s.status === 'scheduled') {
      return {
        ...acc,
        scheduledCents: (acc.scheduledCents + pay) as Cents,
        scheduledCount: acc.scheduledCount + 1,
      };
    }
    // cancelled / no_show contribute nothing.
    return acc;
  }, ZERO);

/** How one completed session's fee is settled. 'free' = a $0 session: nothing due. */
export type SessionCoverage = 'paid' | 'credit' | 'partial' | 'unpaid' | 'free';

export interface SessionSettlement {
  readonly status: SessionCoverage;
  /** The session's fee: its pending/overdue payment's amount if billed, else expected. */
  readonly feeCents: Cents;
  /** How much prepaid credit was applied to it (0 unless 'credit' or 'partial'). */
  readonly creditAppliedCents: Cents;
}

export interface StudentAccount {
  /** All money actually received (every paid payment). */
  readonly collectedCents: Cents;
  /** Money received in advance: paid payments not tied to one of these sessions. */
  readonly prepaidCents: Cents;
  /** Prepaid credit not yet used up by completed sessions. */
  readonly creditCents: Cents;
  /** Earned but not received: completed sessions not settled by their own payment or credit. */
  readonly owedCents: Cents;
  /** Completed sessions with any amount still unpaid after credit. */
  readonly owedSessionCount: number;
  /** Completed sessions settled wholly or partly by prepaid credit. */
  readonly creditSessionCount: number;
  /** Settlement for every COMPLETED session, keyed by session id. */
  readonly settlements: ReadonlyMap<string, SessionSettlement>;
}

/** Oldest first: by date, then start time, then creation (two sessions in one slot). */
const chronological = (a: Session, b: Session) =>
  a.date !== b.date
    ? a.date < b.date ? -1 : 1
    : a.startTime !== b.startTime
      ? a.startTime < b.startTime ? -1 : 1
      : (a.createdAt ?? 0) - (b.createdAt ?? 0);

/**
 * A student's running account: money in vs. sessions taught. Answers "has this family
 * paid me?", "how much prepaid credit is left?" and "which sessions did it cover?".
 *
 * - A session with a PAID payment of its own is settled directly.
 * - Every other paid payment — no session, a session no longer in the list (deleted),
 *   or a session that was cancelled or a no-show — is prepaid credit: the money was
 *   received but isn't paying for a session that happened.
 * - Credit is applied automatically to completed, not-directly-paid sessions, OLDEST
 *   FIRST, covering a session fully ('credit') or, when it runs out, partly ('partial').
 * - Nothing about the allocation is stored: undoing a completion, deleting a session or
 *   editing an amount simply re-derives it (and can't create sync duplicates).
 * - Cancelled payments count for nothing; scheduled/cancelled sessions owe nothing.
 * - Owed counts completed sessions only — never an unpaid sessionless payment.
 */
export const studentAccount = (sessions: readonly Session[], payments: readonly Payment[]): StudentAccount => {
  const sessionIds = new Set(sessions.map((s) => s.id as string));
  // Sessions that didn't (or won't) happen: money paid for one of them isn't tied to it.
  const didNotHappen = new Set(
    sessions.filter((s) => s.status === 'cancelled' || s.status === 'no_show').map((s) => s.id as string),
  );
  const live = payments.filter((p) => p.status !== 'cancelled');

  let collected = 0;
  let prepaid = 0;
  const bySession = new Map<string, Payment[]>();
  for (const p of live) {
    const own = p.sessionId != null && sessionIds.has(p.sessionId);
    if (p.status === 'paid') {
      collected += p.amount;
      // Credit: no session, a session that's gone, or one that was cancelled/no-show.
      if (!own || didNotHappen.has(p.sessionId as string)) prepaid += p.amount;
    }
    if (own) bySession.set(p.sessionId as string, [...(bySession.get(p.sessionId as string) ?? []), p]);
  }

  let credit = prepaid;
  let owed = 0;
  let owedSessionCount = 0;
  let creditSessionCount = 0;
  const settlements = new Map<string, SessionSettlement>();

  for (const s of [...sessions].filter((x) => x.status === 'completed').sort(chronological)) {
    const forSession = bySession.get(s.id) ?? [];
    const paidOwn = forSession.find((p) => p.status === 'paid');
    if (paidOwn) {
      settlements.set(s.id, { status: 'paid', feeCents: paidOwn.amount, creditAppliedCents: 0 as Cents });
      continue;
    }
    const fee = forSession[0]?.amount ?? sessionPaymentCents(s);
    if (fee === 0) {
      // A free session (e.g. a $0 trial) owes nothing and uses no credit.
      settlements.set(s.id, { status: 'free', feeCents: 0 as Cents, creditAppliedCents: 0 as Cents });
      continue;
    }
    const applied = Math.min(credit, fee);
    credit -= applied;
    const remaining = fee - applied;
    owed += remaining;
    if (applied > 0) creditSessionCount += 1;
    if (remaining > 0) owedSessionCount += 1;
    settlements.set(s.id, {
      status: remaining === 0 ? 'credit' : applied > 0 ? 'partial' : 'unpaid',
      feeCents: fee as Cents,
      creditAppliedCents: applied as Cents,
    });
  }

  // Owed is only ever money for sessions taught. An unpaid payment with no session is a
  // requested prepayment (not yet received, not yet earned), and an unpaid payment
  // whose session is gone has nothing to be owed for — neither adds to owed.

  return {
    collectedCents: collected as Cents,
    prepaidCents: prepaid as Cents,
    creditCents: credit as Cents,
    owedCents: owed as Cents,
    owedSessionCount,
    creditSessionCount,
    settlements,
  };
};

/**
 * How many more sessions prepaid credit covers at a given default rate and length —
 * the "when do I ask for more?" number. Null when the default fee is zero.
 */
export const sessionsCoveredByCredit = (
  creditCents: Cents,
  hourlyRateCents: Cents,
  durationMinutes: number,
): number | null => {
  const fee = expectedPaymentCents(hourlyRateCents, durationMinutes);
  return fee > 0 ? Math.floor(creditCents / fee) : null;
};
