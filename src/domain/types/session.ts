/**
 * Session (lesson) domain type. (DOMAIN layer — pure TS.)
 *
 * `date` + `startTime` are stored as wall-clock values (a calendar date and a
 * local time of day), NOT epoch millis. Tutoring is scheduled in local wall-clock
 * terms — "Tuesday at 3pm" must remain 3pm regardless of DST or device timezone —
 * so wall-clock storage is the correct, drift-free representation here. Audit
 * instants (createdAt/updatedAt) remain true UTC epoch millis.
 */
import type {
  Cents,
  Entity,
  IsoDate,
  IsoTime,
  SessionId,
  StudentId,
} from './common';

export type SessionStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export const SESSION_STATUSES: readonly SessionStatus[] = [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
];

export interface Session extends Entity<SessionId> {
  readonly studentId: StudentId;
  readonly title: string;
  readonly date: IsoDate;
  readonly startTime: IsoTime;
  /** Duration in minutes. */
  readonly duration: number;
  /** Snapshot of the rate (cents) at session time, so later rate changes don't rewrite history. */
  readonly hourlyRate: Cents;
  readonly location: string | null;
  readonly status: SessionStatus;
  readonly notes: string | null;
}
