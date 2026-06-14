/**
 * Email template domain type — reusable message bodies. (DOMAIN layer — pure TS.)
 */
import type { EmailTemplateId, Entity } from './common';

export interface EmailTemplate extends Entity<EmailTemplateId> {
  readonly title: string;
  /** Body content; may contain placeholder tokens resolved at send time. */
  readonly content: string;
}
