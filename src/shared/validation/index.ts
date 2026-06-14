/**
 * Validation layer.
 *
 * Pure, dependency-free, fully typed runtime validation for every entity's
 * create/update payload. Repositories run the matching validator before any write,
 * so invalid data can never reach SQLite — a single enforcement point. The UI can
 * call the same validators to drive inline form errors.
 *
 * Each `validate*` takes a typed `CreateInput<T>` (compile-time shape) and checks
 * runtime constraints (non-empty, ranges, formats, enum membership), returning the
 * value unchanged on success or a list of field errors on failure.
 */
import type { CreateInput } from '../../domain/types/common';
import type { Assignment } from '../../domain/types/assignment';
import { ASSIGNMENT_STATUSES } from '../../domain/types/assignment';
import type { ChecklistItem } from '../../domain/types/checklist';
import type { EmailTemplate } from '../../domain/types/emailTemplate';
import type { Payment } from '../../domain/types/payment';
import { PAYMENT_STATUSES } from '../../domain/types/payment';
import type { SatScore, SatSkillPerformance } from '../../domain/types/sat';
import {
  SAT_SECTION_MAX,
  SAT_SECTION_MIN,
  SAT_TOTAL_MAX,
  SAT_TOTAL_MIN,
} from '../../domain/types/sat';
import type { Session } from '../../domain/types/session';
import { SESSION_STATUSES } from '../../domain/types/session';
import type { Student } from '../../domain/types/student';
import { GRADE_LEVELS, STUDENT_STATUSES } from '../../domain/types/student';
import { isIsoDate, isIsoTime } from '../utils/time';

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------
export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

// ---------------------------------------------------------------------------
// Field-level check primitives — each pushes to an accumulator on failure
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class Checker {
  readonly errors: ValidationError[] = [];

  private fail(field: string, message: string): void {
    this.errors.push({ field, message });
  }

  requiredString(field: string, value: unknown, max = 500): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      this.fail(field, `${field} is required`);
    } else if (value.length > max) {
      this.fail(field, `${field} must be at most ${max} characters`);
    }
  }

  optionalString(field: string, value: unknown, max = 2000): void {
    if (value == null) return;
    if (typeof value !== 'string') this.fail(field, `${field} must be a string`);
    else if (value.length > max) this.fail(field, `${field} must be at most ${max} characters`);
  }

  email(field: string, value: unknown, { required }: { required: boolean }): void {
    if (value == null || value === '') {
      if (required) this.fail(field, `${field} is required`);
      return;
    }
    if (typeof value !== 'string' || !EMAIL_RE.test(value)) {
      this.fail(field, `${field} must be a valid email address`);
    }
  }

  requiredId(field: string, value: unknown): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      this.fail(field, `${field} is required`);
    }
  }

  intInRange(field: string, value: unknown, min: number, max: number): void {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      this.fail(field, `${field} must be an integer`);
    } else if (value < min || value > max) {
      this.fail(field, `${field} must be between ${min} and ${max}`);
    }
  }

  numberInRange(field: string, value: unknown, min: number, max: number): void {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      this.fail(field, `${field} must be a number`);
    } else if (value < min || value > max) {
      this.fail(field, `${field} must be between ${min} and ${max}`);
    }
  }

  oneOf<V>(field: string, value: unknown, allowed: readonly V[]): void {
    if (!allowed.includes(value as V)) {
      this.fail(field, `${field} must be one of: ${allowed.join(', ')}`);
    }
  }

  optionalOneOf<V>(field: string, value: unknown, allowed: readonly V[]): void {
    if (value == null) return;
    this.oneOf(field, value, allowed);
  }

  isoDate(field: string, value: unknown, { required }: { required: boolean }): void {
    if (value == null || value === '') {
      if (required) this.fail(field, `${field} is required`);
      return;
    }
    if (typeof value !== 'string' || !isIsoDate(value)) {
      this.fail(field, `${field} must be a valid date (YYYY-MM-DD)`);
    }
  }

  isoTime(field: string, value: unknown, { required }: { required: boolean }): void {
    if (value == null || value === '') {
      if (required) this.fail(field, `${field} is required`);
      return;
    }
    if (typeof value !== 'string' || !isIsoTime(value)) {
      this.fail(field, `${field} must be a valid time (HH:mm)`);
    }
  }

  boolean(field: string, value: unknown): void {
    if (typeof value !== 'boolean') this.fail(field, `${field} must be true or false`);
  }
}

const finish = <T>(c: Checker, value: T): ValidationResult<T> =>
  c.errors.length === 0 ? { ok: true, value } : { ok: false, errors: c.errors };

// ---------------------------------------------------------------------------
// Entity validators
// ---------------------------------------------------------------------------
export const validateStudent = (
  input: CreateInput<Student>,
): ValidationResult<CreateInput<Student>> => {
  const c = new Checker();
  c.requiredString('name', input.name, 120);
  c.email('email', input.email, { required: false });
  c.email('parentEmail', input.parentEmail, { required: false });
  c.optionalOneOf('gradeLevel', input.gradeLevel, GRADE_LEVELS);
  c.optionalString('school', input.school, 200);
  c.optionalString('notes', input.notes, 5000);
  c.oneOf('status', input.status, STUDENT_STATUSES);
  c.intInRange('defaultDuration', input.defaultDuration, 1, 600);
  c.intInRange('defaultHourlyRate', input.defaultHourlyRate, 0, 100_000_00);
  return finish(c, input);
};

export const validateSession = (
  input: CreateInput<Session>,
): ValidationResult<CreateInput<Session>> => {
  const c = new Checker();
  c.requiredId('studentId', input.studentId);
  c.requiredString('title', input.title, 200);
  c.isoDate('date', input.date, { required: true });
  c.isoTime('startTime', input.startTime, { required: true });
  c.intInRange('duration', input.duration, 1, 600);
  c.intInRange('hourlyRate', input.hourlyRate, 0, 100_000_00);
  c.optionalString('location', input.location, 200);
  c.oneOf('status', input.status, SESSION_STATUSES);
  c.optionalString('notes', input.notes, 5000);
  return finish(c, input);
};

export const validateAssignment = (
  input: CreateInput<Assignment>,
): ValidationResult<CreateInput<Assignment>> => {
  const c = new Checker();
  c.requiredId('sessionId', input.sessionId);
  c.requiredString('title', input.title, 200);
  c.optionalString('details', input.details, 5000);
  c.isoDate('dueDate', input.dueDate, { required: false });
  c.oneOf('status', input.status, ASSIGNMENT_STATUSES);
  return finish(c, input);
};

export const validateChecklistItem = (
  input: CreateInput<ChecklistItem>,
): ValidationResult<CreateInput<ChecklistItem>> => {
  const c = new Checker();
  c.requiredId('sessionId', input.sessionId);
  c.requiredString('text', input.text, 500);
  c.boolean('completed', input.completed);
  return finish(c, input);
};

export const validatePayment = (
  input: CreateInput<Payment>,
): ValidationResult<CreateInput<Payment>> => {
  const c = new Checker();
  c.requiredId('studentId', input.studentId);
  if (input.sessionId != null) c.requiredId('sessionId', input.sessionId);
  c.intInRange('amount', input.amount, 0, 100_000_00);
  c.oneOf('status', input.status, PAYMENT_STATUSES);
  c.isoDate('receivedDate', input.receivedDate, { required: false });
  // A paid payment must have a received date.
  if (input.status === 'paid' && input.receivedDate == null) {
    c.errors.push({ field: 'receivedDate', message: 'receivedDate is required when status is paid' });
  }
  return finish(c, input);
};

export const validateEmailTemplate = (
  input: CreateInput<EmailTemplate>,
): ValidationResult<CreateInput<EmailTemplate>> => {
  const c = new Checker();
  c.requiredString('title', input.title, 200);
  c.requiredString('content', input.content, 20000);
  return finish(c, input);
};

export const validateSatScore = (
  input: CreateInput<SatScore>,
): ValidationResult<CreateInput<SatScore>> => {
  const c = new Checker();
  c.requiredId('studentId', input.studentId);
  c.isoDate('date', input.date, { required: true });
  c.requiredString('testName', input.testName, 200);
  c.intInRange('readingWritingScore', input.readingWritingScore, SAT_SECTION_MIN, SAT_SECTION_MAX);
  c.intInRange('mathScore', input.mathScore, SAT_SECTION_MIN, SAT_SECTION_MAX);
  c.intInRange('totalScore', input.totalScore, SAT_TOTAL_MIN, SAT_TOTAL_MAX);
  return finish(c, input);
};

export const validateSatSkillPerformance = (
  input: CreateInput<SatSkillPerformance>,
): ValidationResult<CreateInput<SatSkillPerformance>> => {
  const c = new Checker();
  c.requiredId('studentId', input.studentId);
  c.requiredString('skill', input.skill, 120);
  c.numberInRange('accuracy', input.accuracy, 0, 100);
  c.isoDate('date', input.date, { required: true });
  return finish(c, input);
};
