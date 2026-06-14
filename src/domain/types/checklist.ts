/**
 * Checklist item domain type — lightweight per-session to-dos. (DOMAIN layer — pure TS.)
 */
import type { ChecklistItemId, Entity, SessionId } from './common';

export interface ChecklistItem extends Entity<ChecklistItemId> {
  readonly sessionId: SessionId;
  readonly text: string;
  readonly completed: boolean;
}
