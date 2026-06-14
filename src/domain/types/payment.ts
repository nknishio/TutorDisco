/**
 * Payment domain type. (DOMAIN layer — pure TS.)
 *
 * `amount` is integer minor units (cents). Currency is taken from app settings
 * (single-currency per tutor for v1) and is therefore not stored per-row.
 */
import type {
  Cents,
  Entity,
  IsoDate,
  PaymentId,
  SessionId,
  StudentId,
} from './common';

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'pending',
  'paid',
  'overdue',
  'cancelled',
];

export interface Payment extends Entity<PaymentId> {
  readonly studentId: StudentId;
  /** The session this payment covers, if it maps to one. Null for ad-hoc payments. */
  readonly sessionId: SessionId | null;
  readonly amount: Cents;
  readonly status: PaymentStatus;
  /** Date the money was received; null while still pending. */
  readonly receivedDate: IsoDate | null;
}
