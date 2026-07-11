/**
 * Row ↔ entity mappers.
 *
 * The ONLY place the DB's snake_case scalar rows meet the domain's camelCase,
 * branded entities. No snake_case and no raw rows leak above the data layer.
 * Booleans are stored as 0/1; timestamps as integers; absent values as NULL.
 */
import type {
  Cents,
  EpochMillis,
  IsoDate,
  IsoTime,
  Percentage,
  Row,
  SyncMeta,
  SyncStatus,
} from '../../domain/types/common';
import type { Assignment, AssignmentStatus } from '../../domain/types/assignment';
import type { CalendarEventLink, CalendarProviderId } from '../../domain/types/calendar';
import type { ChecklistItem } from '../../domain/types/checklist';
import type { EmailTemplate } from '../../domain/types/emailTemplate';
import type { Payment, PaymentStatus } from '../../domain/types/payment';
import type {
  AppSettings,
  StudentSortDir,
  StudentSortKey,
  ThemePreference,
} from '../../domain/types/settings';
import type { CurrencyCode, Timezone } from '../../domain/types/common';
import type {
  SatScore,
  SatSkillPerformance,
  SectionScore,
  TotalScore,
} from '../../domain/types/sat';
import type { Session, SessionStatus } from '../../domain/types/session';
import type { GradeLevel, Student, StudentStatus } from '../../domain/types/student';
import {
  asId,
} from '../../shared/utils/id';
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
  Uuid,
} from '../../domain/types/common';

/** Translates between a persisted entity `T` and a raw SQLite `Row`. */
export interface RowMapper<T> {
  toRow(entity: T): Row;
  fromRow(row: Row): T;
}

// ---------------------------------------------------------------------------
// Scalar coercion helpers
// ---------------------------------------------------------------------------
// With `noUncheckedIndexedAccess`, reading a row cell yields `… | undefined`, so
// helpers accept and normalize undefined (treated as a missing/NULL cell).
type Cell = string | number | null | undefined;

const asString = (v: Cell): string => String(v);
const asStringOrNull = (v: Cell): string | null => (v == null ? null : String(v));
const asNumber = (v: Cell): number => Number(v);
const asBool = (v: Cell): boolean => v === 1 || v === '1';
const fromBool = (v: boolean): number => (v ? 1 : 0);

/** Parse a JSON-encoded array of strings, tolerating null/empty/malformed cells. */
const asStringArray = (v: Cell): string[] => {
  if (typeof v !== 'string' || v.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/** Parse a JSON-encoded array of finite numbers, tolerating null/empty/malformed cells. */
const asNumberArray = (v: Cell): number[] => {
  if (typeof v !== 'string' || v.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(v);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
      : [];
  } catch {
    return [];
  }
};

const STUDENT_SORT_KEYS: readonly StudentSortKey[] = [
  'name',
  'nextSession',
  'firstSession',
  'rate',
  'status',
  'custom',
];

/** Parse the persisted sort key, falling back to `custom` for unknown/legacy values. */
const asStudentSortKey = (v: Cell): StudentSortKey =>
  STUDENT_SORT_KEYS.includes(v as StudentSortKey) ? (v as StudentSortKey) : 'custom';

/** Parse the persisted sort direction, falling back to `asc`. */
const asStudentSortDir = (v: Cell): StudentSortDir => (v === 'desc' ? 'desc' : 'asc');

// ---------------------------------------------------------------------------
// Shared sync-metadata mapping
// ---------------------------------------------------------------------------
const syncMetaToRow = (m: SyncMeta): Row => ({
  created_at: m.createdAt,
  updated_at: m.updatedAt,
  deleted_at: m.deletedAt,
  sync_status: m.syncStatus,
  server_rev: m.serverRev,
});

const syncMetaFromRow = (row: Row): SyncMeta => ({
  createdAt: asNumber(row.created_at) as EpochMillis,
  updatedAt: asNumber(row.updated_at) as EpochMillis,
  deletedAt: row.deleted_at == null ? null : (asNumber(row.deleted_at) as EpochMillis),
  syncStatus: asString(row.sync_status) as SyncStatus,
  serverRev: row.server_rev == null ? null : asNumber(row.server_rev),
});

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------
export const studentMapper: RowMapper<Student> = {
  toRow: (s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    parent_name: s.parentName,
    parent_email: s.parentEmail,
    grade_level: s.gradeLevel,
    school: s.school,
    notes: s.notes,
    status: s.status,
    default_duration: s.defaultDuration,
    default_hourly_rate: s.defaultHourlyRate,
    ...syncMetaToRow(s),
  }),
  fromRow: (row) => ({
    id: asId<StudentId>(asString(row.id)),
    name: asString(row.name),
    email: asStringOrNull(row.email),
    parentName: asStringOrNull(row.parent_name),
    parentEmail: asStringOrNull(row.parent_email),
    gradeLevel: asStringOrNull(row.grade_level) as GradeLevel | null,
    school: asStringOrNull(row.school),
    notes: asStringOrNull(row.notes),
    status: asString(row.status) as StudentStatus,
    defaultDuration: asNumber(row.default_duration),
    defaultHourlyRate: asNumber(row.default_hourly_rate) as Cents,
    ...syncMetaFromRow(row),
  }),
};

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
export const sessionMapper: RowMapper<Session> = {
  toRow: (s) => ({
    id: s.id,
    student_id: s.studentId,
    title: s.title,
    date: s.date,
    start_time: s.startTime,
    duration: s.duration,
    hourly_rate: s.hourlyRate,
    location: s.location,
    status: s.status,
    notes: s.notes,
    ...syncMetaToRow(s),
  }),
  fromRow: (row) => ({
    id: asId<SessionId>(asString(row.id)),
    studentId: asId<StudentId>(asString(row.student_id)),
    title: asString(row.title),
    date: asString(row.date) as IsoDate,
    startTime: asString(row.start_time) as IsoTime,
    duration: asNumber(row.duration),
    hourlyRate: asNumber(row.hourly_rate) as Cents,
    location: asStringOrNull(row.location),
    status: asString(row.status) as SessionStatus,
    notes: asStringOrNull(row.notes),
    ...syncMetaFromRow(row),
  }),
};

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------
export const assignmentMapper: RowMapper<Assignment> = {
  toRow: (a) => ({
    id: a.id,
    session_id: a.sessionId,
    title: a.title,
    details: a.details,
    due_date: a.dueDate,
    status: a.status,
    ...syncMetaToRow(a),
  }),
  fromRow: (row) => ({
    id: asId<AssignmentId>(asString(row.id)),
    sessionId: asId<SessionId>(asString(row.session_id)),
    title: asString(row.title),
    details: asStringOrNull(row.details),
    dueDate: asStringOrNull(row.due_date) as IsoDate | null,
    status: asString(row.status) as AssignmentStatus,
    ...syncMetaFromRow(row),
  }),
};

// ---------------------------------------------------------------------------
// ChecklistItem
// ---------------------------------------------------------------------------
export const checklistItemMapper: RowMapper<ChecklistItem> = {
  toRow: (c) => ({
    id: c.id,
    session_id: c.sessionId,
    text: c.text,
    completed: fromBool(c.completed),
    ...syncMetaToRow(c),
  }),
  fromRow: (row) => ({
    id: asId<ChecklistItemId>(asString(row.id)),
    sessionId: asId<SessionId>(asString(row.session_id)),
    text: asString(row.text),
    completed: asBool(row.completed),
    ...syncMetaFromRow(row),
  }),
};

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
export const paymentMapper: RowMapper<Payment> = {
  toRow: (p) => ({
    id: p.id,
    student_id: p.studentId,
    session_id: p.sessionId,
    amount: p.amount,
    status: p.status,
    received_date: p.receivedDate,
    ...syncMetaToRow(p),
  }),
  fromRow: (row) => ({
    id: asId<PaymentId>(asString(row.id)),
    studentId: asId<StudentId>(asString(row.student_id)),
    sessionId: row.session_id == null ? null : asId<SessionId>(asString(row.session_id)),
    amount: asNumber(row.amount) as Cents,
    status: asString(row.status) as PaymentStatus,
    receivedDate: asStringOrNull(row.received_date) as IsoDate | null,
    ...syncMetaFromRow(row),
  }),
};

// ---------------------------------------------------------------------------
// CalendarEventLink
// ---------------------------------------------------------------------------
export const calendarLinkMapper: RowMapper<CalendarEventLink> = {
  toRow: (l) => ({
    id: l.id,
    session_id: l.sessionId,
    provider: l.provider,
    external_event_id: l.externalEventId,
    calendar_id: l.calendarId,
    title: l.title,
    synced_at: l.syncedAt,
    ...syncMetaToRow(l),
  }),
  fromRow: (row) => ({
    id: asId<CalendarEventLinkId>(asString(row.id)),
    sessionId: asId<SessionId>(asString(row.session_id)),
    provider: asString(row.provider) as CalendarProviderId,
    externalEventId: asString(row.external_event_id),
    calendarId: asStringOrNull(row.calendar_id),
    title: asString(row.title),
    syncedAt: asNumber(row.synced_at) as EpochMillis,
    ...syncMetaFromRow(row),
  }),
};

// ---------------------------------------------------------------------------
// AppSettings (singleton — no sync metadata)
// ---------------------------------------------------------------------------
export const settingsMapper: RowMapper<AppSettings> = {
  toRow: (s) => ({
    id: s.id,
    sat_mode: fromBool(s.satMode),
    theme: s.theme,
    default_currency: s.defaultCurrency,
    default_rate_cents: s.defaultRateCents,
    timezone: s.timezone,
    default_checklist_items: JSON.stringify(s.defaultChecklistItems ?? []),
    default_calendar_alerts: JSON.stringify(s.defaultCalendarAlerts ?? []),
    student_sort_key: s.studentSortKey,
    student_sort_dir: s.studentSortDir,
    student_custom_order: JSON.stringify(s.studentCustomOrder ?? []),
    email_template_order: JSON.stringify(s.emailTemplateOrder ?? []),
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  }),
  fromRow: (row) => ({
    id: 'singleton',
    satMode: asBool(row.sat_mode),
    theme: asString(row.theme) as ThemePreference,
    defaultCurrency: asString(row.default_currency) as CurrencyCode,
    defaultRateCents:
      row.default_rate_cents == null ? null : (asNumber(row.default_rate_cents) as Cents),
    timezone: asStringOrNull(row.timezone) as Timezone | null,
    defaultChecklistItems: asStringArray(row.default_checklist_items),
    defaultCalendarAlerts: asNumberArray(row.default_calendar_alerts),
    studentSortKey: asStudentSortKey(row.student_sort_key),
    studentSortDir: asStudentSortDir(row.student_sort_dir),
    studentCustomOrder: asStringArray(row.student_custom_order),
    emailTemplateOrder: asStringArray(row.email_template_order),
    createdAt: asNumber(row.created_at) as EpochMillis,
    updatedAt: asNumber(row.updated_at) as EpochMillis,
  }),
};

// ---------------------------------------------------------------------------
// EmailTemplate
// ---------------------------------------------------------------------------
export const emailTemplateMapper: RowMapper<EmailTemplate> = {
  toRow: (t) => ({
    id: t.id,
    title: t.title,
    content: t.content,
    ...syncMetaToRow(t),
  }),
  fromRow: (row) => ({
    id: asId<EmailTemplateId>(asString(row.id)),
    title: asString(row.title),
    content: asString(row.content),
    ...syncMetaFromRow(row),
  }),
};

// ---------------------------------------------------------------------------
// SatScore
// ---------------------------------------------------------------------------
export const satScoreMapper: RowMapper<SatScore> = {
  toRow: (s) => ({
    id: s.id,
    student_id: s.studentId,
    date: s.date,
    test_name: s.testName,
    reading_writing_score: s.readingWritingScore,
    math_score: s.mathScore,
    total_score: s.totalScore,
    ...syncMetaToRow(s),
  }),
  fromRow: (row) => ({
    id: asId<SatScoreId>(asString(row.id)),
    studentId: asId<StudentId>(asString(row.student_id)),
    date: asString(row.date) as IsoDate,
    testName: asString(row.test_name),
    readingWritingScore: asNumber(row.reading_writing_score) as SectionScore,
    mathScore: asNumber(row.math_score) as SectionScore,
    totalScore: asNumber(row.total_score) as TotalScore,
    ...syncMetaFromRow(row),
  }),
};

// ---------------------------------------------------------------------------
// SatSkillPerformance
// ---------------------------------------------------------------------------
export const satSkillPerformanceMapper: RowMapper<SatSkillPerformance> = {
  toRow: (s) => ({
    id: s.id,
    student_id: s.studentId,
    skill: s.skill,
    accuracy: s.accuracy,
    date: s.date,
    ...syncMetaToRow(s),
  }),
  fromRow: (row) => ({
    id: asId<SatSkillPerformanceId>(asString(row.id)),
    studentId: asId<StudentId>(asString(row.student_id)),
    skill: asString(row.skill),
    accuracy: asNumber(row.accuracy) as Percentage,
    date: asString(row.date) as IsoDate,
    ...syncMetaFromRow(row),
  }),
};

// Re-export for callers that want the Uuid brand without reaching into common.
export type { Uuid };
