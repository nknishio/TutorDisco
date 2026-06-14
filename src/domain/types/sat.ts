/**
 * SAT domain types: practice/official score records and per-skill performance.
 * (DOMAIN layer — pure TS.)
 *
 * These types always exist regardless of the SAT Mode setting. SAT Mode only
 * governs whether the UI surfaces them — the data model is invariant.
 *
 * Digital SAT scoring reference:
 *   - Total: 400–1600
 *   - Each section (Reading & Writing, Math): 200–800
 */
import type {
  Entity,
  IsoDate,
  Percentage,
  SatScoreId,
  SatSkillPerformanceId,
  StudentId,
} from './common';

declare const __satBrand: unique symbol;
type SatBrand<T, B> = T & { readonly [__satBrand]: B };

/** A total SAT score, guaranteed in 400–1600. */
export type TotalScore = SatBrand<number, 'TotalScore'>;
/** A section score, guaranteed in 200–800. */
export type SectionScore = SatBrand<number, 'SectionScore'>;

export const SAT_TOTAL_MIN = 400;
export const SAT_TOTAL_MAX = 1600;
export const SAT_SECTION_MIN = 200;
export const SAT_SECTION_MAX = 800;

export interface SatScore extends Entity<SatScoreId> {
  readonly studentId: StudentId;
  readonly date: IsoDate;
  /** Human label, e.g. 'College Board Practice Test 4', 'March 2026 Official'. */
  readonly testName: string;
  readonly readingWritingScore: SectionScore;
  readonly mathScore: SectionScore;
  /** Stored as reported; may differ slightly from rw+math due to official rounding. */
  readonly totalScore: TotalScore;
}

export interface SatSkillPerformance extends Entity<SatSkillPerformanceId> {
  readonly studentId: StudentId;
  /** Skill/domain label, e.g. 'Algebra', 'Information & Ideas'. */
  readonly skill: string;
  /** Accuracy as a percentage, 0–100. */
  readonly accuracy: Percentage;
  readonly date: IsoDate;
}
