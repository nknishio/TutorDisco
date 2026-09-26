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

export interface StudentBalance {
  /** Money actually received (paid payments). */
  readonly collectedCents: Cents;
  /**
   * Money earned but not yet received: every completed session that isn't paid —
   * using its pending/overdue payment's amount when one exists, otherwise the
   * session's expected payment (it simply hasn't been billed yet) — plus any
   * unpaid ad-hoc payments.
   */
  readonly owedCents: Cents;
  /** How many completed sessions are still unpaid. */
  readonly owedSessionCount: number;
}

/**
 * Where a student's money stands, from their sessions and payments. Answers "has this
 * family paid me?" without requiring completed sessions to have been billed first.
 * Cancelled payments count for nothing; a session with any paid payment is settled.
 */
export const studentBalance = (sessions: readonly Session[], payments: readonly Payment[]): StudentBalance => {
  const live = payments.filter((p) => p.status !== 'cancelled');
  const bySession = new Map<string, Payment[]>();
  let collected = 0;
  let owed = 0;
  for (const p of live) {
    if (p.status === 'paid') collected += p.amount;
    if (p.sessionId) bySession.set(p.sessionId, [...(bySession.get(p.sessionId) ?? []), p]);
  }

  const sessionIds = new Set(sessions.map((s) => s.id as string));
  let owedSessionCount = 0;
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const forSession = bySession.get(s.id) ?? [];
    if (forSession.some((p) => p.status === 'paid')) continue;
    const pending = forSession[0];
    owed += pending ? pending.amount : sessionPaymentCents(s);
    owedSessionCount += 1;
  }
  // Unpaid payments not tied to one of these completed sessions (ad-hoc, or a
  // session that's no longer listed) still count as owed.
  for (const p of live) {
    if (p.status === 'paid') continue;
    if (p.sessionId && sessionIds.has(p.sessionId)) continue;
    owed += p.amount;
  }

  return { collectedCents: collected as Cents, owedCents: owed as Cents, owedSessionCount };
};
