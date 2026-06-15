/**
 * Concrete SQLite repositories + the `createRepositories` factory used by DI.
 *
 * Each repo wires the base class to its table, mapper, and validator, then adds the
 * entity-specific finders declared in the domain repository interfaces.
 */
import type {
  AssignmentId,
  CalendarEventLinkId,
  ChecklistItemId,
  CurrencyCode,
  EmailTemplateId,
  PaymentId,
  Result,
  Row,
  SatScoreId,
  SatSkillPerformanceId,
  SessionId,
  StudentId,
} from '../../domain/types/common';
import type { Assignment } from '../../domain/types/assignment';
import type { CalendarEventLink } from '../../domain/types/calendar';
import type { ChecklistItem } from '../../domain/types/checklist';
import type { EmailTemplate } from '../../domain/types/emailTemplate';
import type { Payment } from '../../domain/types/payment';
import type { SatScore, SatSkillPerformance } from '../../domain/types/sat';
import type { Session } from '../../domain/types/session';
import type { AppSettings, SettingsPatch } from '../../domain/types/settings';
import type { Student, StudentStatus } from '../../domain/types/student';
import type {
  AssignmentRepository,
  CalendarEventLinkRepository,
  ChecklistItemRepository,
  EmailTemplateRepository,
  ListOptions,
  PaymentRepository,
  Repositories,
  SatScoreRepository,
  SatSkillPerformanceRepository,
  SessionRepository,
  SettingsRepository,
  StudentRepository,
} from '../../domain/repositories';
import {
  validateAssignment,
  validateCalendarLink,
  validateChecklistItem,
  validateEmailTemplate,
  validatePayment,
  validateSatScore,
  validateSatSkillPerformance,
  validateSession,
  validateStudent,
} from '../../shared/validation';
import { err, ok } from '../../shared/utils/result';
import { nowMillis } from '../../shared/utils/time';
import type { DatabaseClient } from '../db/client';
import {
  assignmentMapper,
  calendarLinkMapper,
  checklistItemMapper,
  emailTemplateMapper,
  paymentMapper,
  satScoreMapper,
  satSkillPerformanceMapper,
  sessionMapper,
  settingsMapper,
  studentMapper,
} from '../mappers';
import { BaseSqliteRepository } from './BaseSqliteRepository';

class SqliteStudentRepository
  extends BaseSqliteRepository<Student, StudentId>
  implements StudentRepository
{
  constructor(db: DatabaseClient) {
    super(db, 'students', studentMapper, validateStudent);
  }

  listByStatus(status: StudentStatus, opts: ListOptions = {}): Promise<readonly Student[]> {
    return this.query(
      `SELECT * FROM students WHERE status = ? AND deleted_at IS NULL ORDER BY name${this.pagination(opts)}`,
      [status],
    );
  }

  search(query: string, opts: ListOptions = {}): Promise<readonly Student[]> {
    const like = `%${query}%`;
    return this.query(
      `SELECT * FROM students WHERE deleted_at IS NULL AND (name LIKE ? OR email LIKE ? OR school LIKE ?) ORDER BY name${this.pagination(opts)}`,
      [like, like, like],
    );
  }
}

class SqliteSessionRepository
  extends BaseSqliteRepository<Session, SessionId>
  implements SessionRepository
{
  constructor(db: DatabaseClient) {
    super(db, 'sessions', sessionMapper, validateSession);
  }

  listByStudent(studentId: StudentId, opts: ListOptions = {}): Promise<readonly Session[]> {
    return this.query(
      `SELECT * FROM sessions WHERE student_id = ? AND deleted_at IS NULL ORDER BY date DESC, start_time DESC${this.pagination(opts)}`,
      [studentId],
    );
  }

  listByDateRange(
    startDate: string,
    endDate: string,
    opts: ListOptions = {},
  ): Promise<readonly Session[]> {
    return this.query(
      `SELECT * FROM sessions WHERE date BETWEEN ? AND ? AND deleted_at IS NULL ORDER BY date, start_time${this.pagination(opts)}`,
      [startDate, endDate],
    );
  }
}

class SqliteAssignmentRepository
  extends BaseSqliteRepository<Assignment, AssignmentId>
  implements AssignmentRepository
{
  constructor(db: DatabaseClient) {
    super(db, 'assignments', assignmentMapper, validateAssignment);
  }

  listBySession(sessionId: SessionId, opts: ListOptions = {}): Promise<readonly Assignment[]> {
    return this.query(
      `SELECT * FROM assignments WHERE session_id = ? AND deleted_at IS NULL ORDER BY due_date IS NULL, due_date, created_at${this.pagination(opts)}`,
      [sessionId],
    );
  }
}

class SqliteChecklistItemRepository
  extends BaseSqliteRepository<ChecklistItem, ChecklistItemId>
  implements ChecklistItemRepository
{
  constructor(db: DatabaseClient) {
    super(db, 'checklist_items', checklistItemMapper, validateChecklistItem);
  }

  listBySession(sessionId: SessionId, opts: ListOptions = {}): Promise<readonly ChecklistItem[]> {
    return this.query(
      `SELECT * FROM checklist_items WHERE session_id = ? AND deleted_at IS NULL ORDER BY created_at${this.pagination(opts)}`,
      [sessionId],
    );
  }
}

class SqlitePaymentRepository
  extends BaseSqliteRepository<Payment, PaymentId>
  implements PaymentRepository
{
  constructor(db: DatabaseClient) {
    super(db, 'payments', paymentMapper, validatePayment);
  }

  listByStudent(studentId: StudentId, opts: ListOptions = {}): Promise<readonly Payment[]> {
    return this.query(
      `SELECT * FROM payments WHERE student_id = ? AND deleted_at IS NULL ORDER BY received_date DESC, created_at DESC${this.pagination(opts)}`,
      [studentId],
    );
  }

  listBySession(sessionId: SessionId, opts: ListOptions = {}): Promise<readonly Payment[]> {
    return this.query(
      `SELECT * FROM payments WHERE session_id = ? AND deleted_at IS NULL ORDER BY created_at DESC${this.pagination(opts)}`,
      [sessionId],
    );
  }
}

class SqliteCalendarLinkRepository
  extends BaseSqliteRepository<CalendarEventLink, CalendarEventLinkId>
  implements CalendarEventLinkRepository
{
  constructor(db: DatabaseClient) {
    super(db, 'calendar_links', calendarLinkMapper, validateCalendarLink);
  }

  listBySession(sessionId: SessionId, opts: ListOptions = {}): Promise<readonly CalendarEventLink[]> {
    return this.query(
      `SELECT * FROM calendar_links WHERE session_id = ? AND deleted_at IS NULL ORDER BY synced_at DESC${this.pagination(opts)}`,
      [sessionId],
    );
  }

  async getActiveForSession(sessionId: SessionId): Promise<CalendarEventLink | null> {
    const rows = await this.listBySession(sessionId, { limit: 1 });
    return rows[0] ?? null;
  }
}

/** Singleton settings row. Bespoke (no generic CRUD, no sync metadata). */
const SETTINGS_ID = 'singleton';

class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async get(): Promise<AppSettings> {
    const row = await this.db.getFirst<Row>(`SELECT * FROM settings WHERE id = ?`, [SETTINGS_ID]);
    if (row) return settingsMapper.fromRow(row);

    // First access — materialize defaults so callers always get a row back.
    const now = nowMillis();
    const defaults: AppSettings = {
      id: 'singleton',
      satMode: false,
      theme: 'system',
      defaultCurrency: 'USD' as CurrencyCode,
      defaultRateCents: null,
      timezone: null,
      createdAt: now,
      updatedAt: now,
    };
    const insertRow = settingsMapper.toRow(defaults);
    const cols = Object.keys(insertRow);
    await this.db.run(
      `INSERT INTO settings (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => insertRow[c] ?? null),
    );
    return defaults;
  }

  async update(patch: SettingsPatch): Promise<Result<AppSettings>> {
    try {
      const current = await this.get();
      const next: AppSettings = { ...current, ...patch, id: 'singleton', updatedAt: nowMillis() };
      const row = settingsMapper.toRow(next);
      const cols = Object.keys(row).filter((c) => c !== 'id');
      await this.db.run(
        `UPDATE settings SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...cols.map((c) => row[c] ?? null), SETTINGS_ID],
      );
      return ok(next);
    } catch (e) {
      return err('db', 'Failed to update settings', e);
    }
  }
}

class SqliteEmailTemplateRepository
  extends BaseSqliteRepository<EmailTemplate, EmailTemplateId>
  implements EmailTemplateRepository
{
  constructor(db: DatabaseClient) {
    super(db, 'email_templates', emailTemplateMapper, validateEmailTemplate);
  }
}

class SqliteSatScoreRepository
  extends BaseSqliteRepository<SatScore, SatScoreId>
  implements SatScoreRepository
{
  constructor(db: DatabaseClient) {
    super(db, 'sat_scores', satScoreMapper, validateSatScore);
  }

  listByStudent(studentId: StudentId, opts: ListOptions = {}): Promise<readonly SatScore[]> {
    return this.query(
      `SELECT * FROM sat_scores WHERE student_id = ? AND deleted_at IS NULL ORDER BY date DESC${this.pagination(opts)}`,
      [studentId],
    );
  }
}

class SqliteSatSkillPerformanceRepository
  extends BaseSqliteRepository<SatSkillPerformance, SatSkillPerformanceId>
  implements SatSkillPerformanceRepository
{
  constructor(db: DatabaseClient) {
    super(db, 'sat_skill_performance', satSkillPerformanceMapper, validateSatSkillPerformance);
  }

  listByStudent(studentId: StudentId, opts: ListOptions = {}): Promise<readonly SatSkillPerformance[]> {
    return this.query(
      `SELECT * FROM sat_skill_performance WHERE student_id = ? AND deleted_at IS NULL ORDER BY date DESC${this.pagination(opts)}`,
      [studentId],
    );
  }

  listBySkill(
    studentId: StudentId,
    skill: string,
    opts: ListOptions = {},
  ): Promise<readonly SatSkillPerformance[]> {
    return this.query(
      `SELECT * FROM sat_skill_performance WHERE student_id = ? AND skill = ? AND deleted_at IS NULL ORDER BY date${this.pagination(opts)}`,
      [studentId, skill],
    );
  }
}

/** Build the full repository set over a single DB client. Called by DI at startup. */
export const createRepositories = (db: DatabaseClient): Repositories => ({
  students: new SqliteStudentRepository(db),
  sessions: new SqliteSessionRepository(db),
  assignments: new SqliteAssignmentRepository(db),
  checklistItems: new SqliteChecklistItemRepository(db),
  payments: new SqlitePaymentRepository(db),
  calendarLinks: new SqliteCalendarLinkRepository(db),
  settings: new SqliteSettingsRepository(db),
  emailTemplates: new SqliteEmailTemplateRepository(db),
  satScores: new SqliteSatScoreRepository(db),
  satSkillPerformance: new SqliteSatSkillPerformanceRepository(db),
});
