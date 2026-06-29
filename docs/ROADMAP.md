# Roadmap

A pragmatic, sequenced plan. Items are grouped by horizon. Technical-debt items that came
out of the code review live in **[REVIEW.md](../REVIEW.md)**; the ones worth scheduling are
folded in below.

Legend: 🟢 small · 🟡 medium · 🔴 large

---

## Now (next release)

Foundational quality before adding surface area.

- 🟡 **Automated test suite** — stand up Jest + RNTL and an in-memory `DatabaseClient`,
  then cover the domain services, mappers, and repositories. See [TESTING.md](TESTING.md).
- 🟢 **Lint + CI** — add ESLint and a CI pipeline running `typecheck`, `lint`, and `test`
  on every PR.
- 🟢 **Confirm-before-destroy** — extend the inline confirm used for deleting sessions to
  the other destructive/fire-and-forget actions (payment delete, template delete). Some
  (session delete, mark/unmark paid) are done.
- 🟡 **Toast/feedback system** — a single app-level toast so async actions report success
  and failure consistently, replacing the mix of inline errors and silent `void` calls.

## Next (1–2 releases out)

- 🔴 **Cloud sync & multi-device** — the data layer is already sync-shaped (tombstones,
  per-row `syncStatus`/`serverRev`, a `DatabaseClient` seam) and per-account databases now
  exist. Add a sync client behind the existing repository contracts so nothing upstream
  changes. Unlocks web↔mobile shared data and cross-device account access.
- 🟡 **Account hardening & backup** — *local password-protected accounts shipped* (see
  `src/auth/`). Follow-ups: optional per-launch re-lock, password change/reset, a stronger
  KDF than salted SHA-256 if `expo-secure-store` is added, and encrypted backup/restore/export.
- 🟡 **Recurring sessions** — schedule weekly/biweekly series with per-occurrence edits.
- 🟡 **Invoicing & receipts** — generate a PDF invoice/receipt from payments; email or share.
- 🟡 **SAT module depth** — score history and per-skill performance views (schema already
  has `sat_scores` and `sat_skill_performance` tables and indexes).
- 🟢 **Reminders** — local notifications for upcoming sessions and overdue payments.

## Later

- 🔴 **Analytics & insights** — retention, revenue trends, utilization, forecasting.
- 🟡 **Multi-tutor / small-team** — shared roster and per-tutor views.
- 🟡 **Calendar two-way sync** — read external edits back (currently sessions are the
  source of truth and push out).
- 🟢 **Localization & currency** — i18n and configurable currency/locale formatting.
- 🟢 **Import/export** — CSV import of students and export of payments for accounting.

---

## Technical roadmap (from the code review)

Scheduled improvements that don't change product surface. Full context in
[REVIEW.md](../REVIEW.md).

- 🟢 **`paymentsStore` indexing** — add a `byStudent` index (mirroring `sessionsStore`) so
  `forStudent` doesn't rebuild the full list per call. Worthwhile once payment volume grows.
- 🟡 **Generic store factory** — the eight Zustand stores share a `byId`/`order` CRUD shape;
  extract a `createCrudStore` factory **after** tests exist to guard the refactor.
- 🟢 **Web focus affordance** — revisit a non-rerender focus-ring approach for `TextField`/
  `Select` (the current no-focus-state choice is deliberate; see the `TextField` header
  comment) to improve keyboard navigation on web.
- 🟢 **Accessibility polish** — derived `accessibilityLabel`s on `Select` triggers and
  pressable table rows; audit caption-text contrast against WCAG AA.
- 🟢 **Deep-link prefixes** — the `easytutor://` scheme is registered; add web URL prefixes
  and verify route configs for shareable links.
- 🟢 **Batch writes** — add a batched insert path to `DatabaseClient` for seeding and the
  eventual sync import.
