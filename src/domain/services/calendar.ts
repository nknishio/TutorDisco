/**
 * Calendar domain service. Pure functions — no I/O, no framework, no `Date.now()`.
 *
 * Turns a session into a provider-agnostic event draft (with the SAT-aware title) and
 * renders an iCalendar (.ics) document. Concrete providers consume the draft; the .ics
 * text is consumed by the ICS provider. Wall-clock date+time are resolved to local
 * instants, matching how sessions are scheduled ("Tuesday at 3pm" stays 3pm).
 */
import type { CalendarEventDraft } from '../types/calendar';
import type { IsoDate, IsoTime } from '../types/common';
import type { Session } from '../types/session';

/**
 * Calendar event title:
 *  - "{Student Name} SAT Tutor" when SAT Mode is enabled
 *  - "{Student Name} Tutoring" otherwise
 */
export const buildEventTitle = (studentName: string, satMode: boolean): string =>
  `${studentName.trim()} ${satMode ? 'SAT Tutor' : 'Tutoring'}`;

/** Resolve a wall-clock date ('YYYY-MM-DD') + time ('HH:mm') into a local Date. */
export const toLocalDate = (date: IsoDate | string, time: IsoTime | string): Date => {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
};

export interface DraftInput {
  readonly session: Pick<Session, 'date' | 'startTime' | 'duration' | 'location' | 'notes'>;
  readonly studentName: string;
  readonly satMode: boolean;
}

/** Build the provider-agnostic event draft for a session. */
export const sessionToEventDraft = ({ session, studentName, satMode }: DraftInput): CalendarEventDraft => {
  const startsAt = toLocalDate(session.date, session.startTime);
  const endsAt = new Date(startsAt.getTime() + session.duration * 60_000);
  return {
    title: buildEventTitle(studentName, satMode),
    startsAt,
    endsAt,
    location: session.location,
    notes: session.notes,
  };
};

// ---------------------------------------------------------------------------
// iCalendar (.ics) rendering
// ---------------------------------------------------------------------------
const pad = (n: number): string => String(n).padStart(2, '0');

/** Floating local time, e.g. '20260615T150000' (no 'Z' — viewer's local zone). */
const icsLocal = (d: Date): string =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

/** Escape per RFC 5545 text rules. */
const icsEscape = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export interface IcsOptions {
  /** Globally-unique event id (UID). */
  readonly uid: string;
  /** DTSTAMP instant; passed in to keep this function pure. */
  readonly stamp: Date;
}

/** Render a single-event VCALENDAR document for the draft. */
export const buildIcsContent = (draft: CalendarEventDraft, opts: IcsOptions): string => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EasyTutor//Tutoring//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${icsLocal(opts.stamp)}`,
    `DTSTART:${icsLocal(draft.startsAt)}`,
    `DTEND:${icsLocal(draft.endsAt)}`,
    `SUMMARY:${icsEscape(draft.title)}`,
  ];
  if (draft.location) lines.push(`LOCATION:${icsEscape(draft.location)}`);
  if (draft.notes) lines.push(`DESCRIPTION:${icsEscape(draft.notes)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
};
