/**
 * Time helpers. Audit instants are UTC epoch millis; scheduling uses wall-clock
 * IsoDate ('YYYY-MM-DD') + IsoTime ('HH:mm'). See session.ts for the rationale.
 */
import type { EpochMillis, IsoDate, IsoTime } from '../../domain/types/common';

/** Current instant as branded epoch millis. */
export const nowMillis = (): EpochMillis => Date.now() as EpochMillis;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** True if `value` is a real calendar date in 'YYYY-MM-DD' form. */
export const isIsoDate = (value: string): value is IsoDate => {
  if (!ISO_DATE_RE.test(value)) return false;
  const ts = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ts)) return false;
  // Reject values normalized by Date (e.g. '2026-02-31' → March): round-trip check.
  return new Date(ts).toISOString().slice(0, 10) === value;
};

/** True if `value` is a valid 24h time in 'HH:mm' form. */
export const isIsoTime = (value: string): value is IsoTime => ISO_TIME_RE.test(value);

/** Brand a known-good date string. */
export const asIsoDate = (value: string): IsoDate => value as IsoDate;
/** Brand a known-good time string. */
export const asIsoTime = (value: string): IsoTime => value as IsoTime;
