/**
 * Display formatting for the wall-clock IsoDate ('YYYY-MM-DD') and IsoTime ('HH:mm')
 * used by sessions. Parsed component-wise to avoid timezone shifts.
 */
import type { IsoDate, IsoTime } from '../../domain/types/common';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-06-14' → 'Jun 14, 2026'. */
export const formatIsoDate = (date: IsoDate | string): string => {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return String(date);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

/** '15:00' → '3:00 PM'. */
export const formatIsoTime = (time: IsoTime | string): string => {
  const [hStr, min] = time.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return String(time);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min ?? '00'} ${period}`;
};

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/** Today as an IsoDate using local wall-clock (for prefilling new-session forms). */
export const todayIsoDate = (): IsoDate => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` as IsoDate;
};
