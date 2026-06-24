/**
 * Repository contracts. (DOMAIN layer.)
 *
 * The application layer depends on these INTERFACES; the data layer provides the
 * SQLite implementations. This is the seam that makes future cloud sync a drop-in
 * (swap the implementation, nothing upstream changes) — see architecture.md §3.
 */
import type {
  CreateInput,
  Entity,
  Result,
  UpdateInput,
  Uuid,
} from '../types/common';
import type { Assignment } from '../types/assignment';
import type { CalendarEventLink } from '../types/calendar';
import type { ChecklistItem } from '../types/checklist';
import type { EmailTemplate } from '../types/emailTemplate';
import type { Payment } from '../types/payment';
import type { SatScore, SatSkillPerformance } from '../types/sat';
import type { Session } from '../types/session';
import type { AppSettings, SettingsPatch } from '../types/settings';
import type { Student, StudentStatus } from '../types/student';
import type {
  AssignmentId,
  CalendarEventLinkId,
  ChecklistItemId,
  EmailTemplateId,
  PaymentId,
  SatScoreId,
  SatSkillPerformanceId,
  SessionId,
  StudentId,
} from '../types/common';

/** Read options shared by every list query. */
export interface ListOptions {
  /** Include soft-deleted rows (default false). */
  readonly includeDeleted?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

/** Generic CRUD surface every repository provides. */
export interface Repository<T extends Entity<Id>, Id extends Uuid> {
  create(input: CreateInput<T>): Promise<Result<T>>;
  getById(id: Id): Promise<T | null>;
  list(opts?: ListOptions): Promise<readonly T[]>;
  update(patch: UpdateInput<T>): Promise<Result<T>>;
  /** Soft delete (tombstone). */
  softDelete(id: Id): Promise<Result<void>>;
  /** Permanent delete. Use sparingly — breaks sync propagation. */
  hardDelete(id: Id): Promise<Result<void>>;
  count(opts?: ListOptions): Promise<number>;
}

// ---------------------------------------------------------------------------
// Entity-specific repositories (generic CRUD + domain-relevant finders)
// ---------------------------------------------------------------------------
export interface StudentRepository extends Repository<Student, StudentId> {
  listByStatus(status: StudentStatus, opts?: ListOptions): Promise<readonly Student[]>;
  search(query: string, opts?: ListOptions): Promise<readonly Student[]>;
}

export interface SessionRepository extends Repository<Session, SessionId> {
  listByStudent(studentId: StudentId, opts?: ListOptions): Promise<readonly Session[]>;
  /** Sessions whose `date` falls within [startDate, endDate] inclusive (YYYY-MM-DD). */
  listByDateRange(
    startDate: string,
    endDate: string,
    opts?: ListOptions,
  ): Promise<readonly Session[]>;
}

export interface AssignmentRepository extends Repository<Assignment, AssignmentId> {
  listBySession(
    sessionId: SessionId,
    opts?: ListOptions,
  ): Promise<readonly Assignment[]>;
}

export interface ChecklistItemRepository
  extends Repository<ChecklistItem, ChecklistItemId> {
  listBySession(
    sessionId: SessionId,
    opts?: ListOptions,
  ): Promise<readonly ChecklistItem[]>;
}

export interface PaymentRepository
  extends Repository<Payment, PaymentId> {
  listByStudent(studentId: StudentId, opts?: ListOptions): Promise<readonly Payment[]>;
  listBySession(sessionId: SessionId, opts?: ListOptions): Promise<readonly Payment[]>;
}

export interface CalendarEventLinkRepository
  extends Repository<CalendarEventLink, CalendarEventLinkId> {
  listBySession(sessionId: SessionId, opts?: ListOptions): Promise<readonly CalendarEventLink[]>;
  /** Most recently synced, non-deleted link for a session, if any. */
  getActiveForSession(sessionId: SessionId): Promise<CalendarEventLink | null>;
}

/**
 * AppSettings is a single row, not a collection, so it gets a bespoke contract
 * rather than the generic CRUD surface.
 */
export interface SettingsRepository {
  /** Read the singleton settings, creating defaults on first access. */
  get(): Promise<AppSettings>;
  update(patch: SettingsPatch): Promise<Result<AppSettings>>;
}

export interface EmailTemplateRepository
  extends Repository<EmailTemplate, EmailTemplateId> {}

export interface SatScoreRepository extends Repository<SatScore, SatScoreId> {
  listByStudent(studentId: StudentId, opts?: ListOptions): Promise<readonly SatScore[]>;
}

export interface SatSkillPerformanceRepository
  extends Repository<SatSkillPerformance, SatSkillPerformanceId> {
  listByStudent(
    studentId: StudentId,
    opts?: ListOptions,
  ): Promise<readonly SatSkillPerformance[]>;
  listBySkill(
    studentId: StudentId,
    skill: string,
    opts?: ListOptions,
  ): Promise<readonly SatSkillPerformance[]>;
}

/** Aggregate handed to the application layer via DI. */
export interface Repositories {
  readonly students: StudentRepository;
  readonly sessions: SessionRepository;
  readonly assignments: AssignmentRepository;
  readonly checklistItems: ChecklistItemRepository;
  readonly payments: PaymentRepository;
  readonly calendarLinks: CalendarEventLinkRepository;
  readonly settings: SettingsRepository;
  readonly emailTemplates: EmailTemplateRepository;
  readonly satScores: SatScoreRepository;
  readonly satSkillPerformance: SatSkillPerformanceRepository;
}
