/**
 * studentSort — pure ordering logic for the students list. (DOMAIN layer — no I/O.)
 *
 * The screen supplies the students to order plus a context of precomputed keys
 * (derived from sessions, which this layer must not read). Sorting by a derived key
 * keeps students that have no value for it (e.g. no upcoming session) at the bottom
 * in BOTH directions — reversing flips only the students that do have a value.
 */
import type { Student, StudentStatus } from '../types/student';
import type { StudentSortDir, StudentSortKey } from '../types/settings';

// Generic id-ordering helpers live in customOrder; re-exported here for existing callers.
export { buildCustomBase, mergeReorder } from './customOrder';

export interface StudentSortContext {
  /** Sort key for a student's next scheduled session, or null if none is scheduled. */
  nextSessionKey: (id: string) => string | null;
  /** Sort key for a student's earliest ever session, or null if they have none. */
  firstSessionKey: (id: string) => string | null;
  /** Full custom arrangement (student ids), already merged with any new students. */
  customBase: readonly string[];
}

/** Ascending status order: the working set first, archived last. */
const STATUS_RANK: Record<StudentStatus, number> = {
  active: 0,
  lead: 1,
  paused: 2,
  archived: 3,
};

const byName = (a: Student, b: Student): number => a.name.localeCompare(b.name);

/** Order students for display. Returns a new array; does not mutate the input. */
export const sortStudents = (
  students: readonly Student[],
  key: StudentSortKey,
  dir: StudentSortDir,
  ctx: StudentSortContext,
): Student[] => {
  if (key === 'custom') {
    const pos = new Map<string, number>();
    ctx.customBase.forEach((id, i) => pos.set(id, i));
    const ordered = [...students].sort(
      (a, b) => (pos.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (pos.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
    return dir === 'desc' ? ordered.reverse() : ordered;
  }

  const keyOf =
    key === 'nextSession'
      ? ctx.nextSessionKey
      : key === 'firstSession'
        ? ctx.firstSessionKey
        : null;

  const present: Student[] = [];
  const missing: Student[] = [];
  for (const s of students) {
    if (keyOf && keyOf(s.id) == null) missing.push(s);
    else present.push(s);
  }

  const asc =
    key === 'name'
      ? byName
      : key === 'rate'
        ? (a: Student, b: Student) => a.defaultHourlyRate - b.defaultHourlyRate || byName(a, b)
        : key === 'status'
          ? (a: Student, b: Student) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || byName(a, b)
          : (a: Student, b: Student) => {
              // Session keys — nulls already split out, so keyOf is non-null here.
              const ka = keyOf!(a.id)!;
              const kb = keyOf!(b.id)!;
              return ka.localeCompare(kb) || byName(a, b);
            };

  present.sort(asc);
  if (dir === 'desc') present.reverse();
  missing.sort(byName);
  return [...present, ...missing];
};

/** Options for the sort-by control, in display order. */
export const STUDENT_SORT_OPTIONS: ReadonlyArray<{ label: string; value: StudentSortKey }> = [
  { label: 'Custom order', value: 'custom' },
  { label: 'Name', value: 'name' },
  { label: 'Next session', value: 'nextSession' },
  { label: 'First session', value: 'firstSession' },
  { label: 'Rate', value: 'rate' },
  { label: 'Status', value: 'status' },
];
