/**
 * Earnings / billing domain service. Pure functions — no I/O, no framework.
 *
 * Money is integer cents throughout. Expected payment for a session is the snapshot
 * hourly rate prorated by duration. Revenue is split by session status so the UI can
 * show earned (completed) vs. projected (scheduled) separately.
 */
import type { Cents } from '../types/common';
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
