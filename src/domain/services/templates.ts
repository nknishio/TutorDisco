/**
 * Email template domain service. Pure functions — no I/O, no framework.
 *
 * Templates are plain text with `{{variable}}` tokens. `renderTemplate` substitutes a
 * value map; unknown tokens are left intact so an unfilled variable is visible rather
 * than silently blank. The supported variables and the four default templates live
 * here so the UI, preview, and seeding share one source of truth.
 */

/** The variables a template may reference. */
export interface TemplateVariable {
  /** Literal token to insert, e.g. '{{student_name}}'. */
  readonly token: string;
  /** Key used in the value map, e.g. 'student_name'. */
  readonly key: string;
  readonly label: string;
  /** Example value used for preview. */
  readonly sample: string;
}

export const TEMPLATE_VARIABLES: readonly TemplateVariable[] = [
  { token: '{{student_name}}', key: 'student_name', label: 'Student name', sample: 'Ava Chen' },
  { token: '{{session_date}}', key: 'session_date', label: 'Session date', sample: 'Jun 15, 2026' },
  { token: '{{next_date}}', key: 'next_date', label: 'Next session date', sample: 'Jun 22, 2026' },
  { token: '{{next_time}}', key: 'next_time', label: 'Next session time', sample: '3:00 PM' },
  { token: '{{homework}}', key: 'homework', label: 'Homework', sample: '• Algebra worksheet (due Jun 20)' },
  { token: '{{parent_name}}', key: 'parent_name', label: 'Parent name', sample: 'Mr. Chen' },
];

/** Sample values keyed by variable, for previewing a template without real data. */
export const SAMPLE_VALUES: Readonly<Record<string, string>> = Object.fromEntries(
  TEMPLATE_VARIABLES.map((v) => [v.key, v.sample]),
);

const TOKEN_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

/**
 * Substitute `{{key}}` tokens with values. Tokens with no matching value are left
 * unchanged so the user can see what still needs filling.
 */
export const renderTemplate = (content: string, values: Readonly<Record<string, string>>): string =>
  content.replace(TOKEN_RE, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] ?? '' : whole,
  );

/** The distinct variable keys referenced in a template body. */
export const extractVariables = (content: string): string[] => {
  const found = new Set<string>();
  for (const match of content.matchAll(TOKEN_RE)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
};

/** A default template definition. Stable ids let seeding be idempotent. */
export interface DefaultTemplate {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

export const DEFAULT_TEMPLATES: readonly DefaultTemplate[] = [
  {
    id: 'default-homework-follow-up',
    title: 'Homework Follow-Up',
    content: `Hi {{parent_name}},

Thanks for a great session with {{student_name}} on {{session_date}}.

Here's the homework to work on before next time:
{{homework}}

Our next session is scheduled for {{next_date}} at {{next_time}}.

Best,`,
  },
  {
    id: 'default-session-reminder',
    title: 'Session Reminder',
    content: `Hi {{parent_name}},

This is a friendly reminder that {{student_name}} has a tutoring session coming up on {{next_date}} at {{next_time}}.

Please reply if you need to reschedule.

Thanks,`,
  },
  {
    id: 'default-monthly-progress-report',
    title: 'Monthly Progress Report',
    content: `Hi {{parent_name}},

Here's a quick progress update for {{student_name}}.

Recent work we've covered:
{{homework}}

We'll keep building on this. Our next session is {{next_date}} at {{next_time}}.

Best,`,
  },
  {
    id: 'default-payment-reminder',
    title: 'Payment Reminder',
    content: `Hi {{parent_name}},

A friendly reminder regarding payment for {{student_name}}'s tutoring.

Most recent session: {{session_date}}.

Please let me know if you have any questions — happy to help.

Thanks,`,
  },
];
