/**
 * Human-readable labels for domain enums. UI never renders a raw enum value
 * ('no_show', 'in_progress', 'lead') — it goes through `labelFor`.
 */
import type { AssignmentStatus } from '../../domain/types/assignment';
import type { PaymentStatus } from '../../domain/types/payment';
import type { SessionStatus } from '../../domain/types/session';
import type { StudentStatus } from '../../domain/types/student';

type AnyStatus = StudentStatus | SessionStatus | AssignmentStatus | PaymentStatus;

const LABELS: Record<AnyStatus, string> = {
  // students
  lead: 'Lead',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
  // sessions
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
  // assignments
  pending: 'Pending',
  in_progress: 'In progress',
  // payments
  paid: 'Paid',
  overdue: 'Overdue',
};

export const labelFor = (status: AnyStatus): string => LABELS[status] ?? status;
