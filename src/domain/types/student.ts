/**
 * Student domain type. (DOMAIN layer — pure TS.)
 */
import type { Cents, Entity, StudentId } from './common';

/** CRM lifecycle of a student, including pre-conversion leads. */
export type StudentStatus = 'lead' | 'active' | 'paused' | 'archived';

export const STUDENT_STATUSES: readonly StudentStatus[] = [
  'lead',
  'active',
  'paused',
  'archived',
];

export type GradeLevel =
  | '9'
  | '10'
  | '11'
  | '12'
  | 'college'
  | 'adult'
  | 'other';

export const GRADE_LEVELS: readonly GradeLevel[] = [
  '9',
  '10',
  '11',
  '12',
  'college',
  'adult',
  'other',
];

export interface Student extends Entity<StudentId> {
  readonly name: string;
  readonly email: string | null;
  readonly parentName: string | null;
  readonly parentEmail: string | null;
  readonly gradeLevel: GradeLevel | null;
  readonly school: string | null;
  readonly notes: string | null;
  readonly status: StudentStatus;
  /** Default session length in minutes; pre-fills new sessions. */
  readonly defaultDuration: number;
  /** Default hourly rate in cents; pre-fills new sessions. */
  readonly defaultHourlyRate: Cents;
}
