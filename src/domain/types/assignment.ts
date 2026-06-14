/**
 * Assignment domain type — homework/tasks tied to a session. (DOMAIN layer — pure TS.)
 */
import type { AssignmentId, Entity, IsoDate, SessionId } from './common';

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed';

export const ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = [
  'pending',
  'in_progress',
  'completed',
];

export interface Assignment extends Entity<AssignmentId> {
  readonly sessionId: SessionId;
  readonly title: string;
  readonly details: string | null;
  readonly dueDate: IsoDate | null;
  readonly status: AssignmentStatus;
}
