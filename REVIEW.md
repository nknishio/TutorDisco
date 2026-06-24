# Senior code review — EasyTutor

**Date:** 2026-06-16 · **Scope:** full codebase (~8.5k LOC, `src/`).

## Verdict

This is a **well-engineered, production-shaped codebase**, not a prototype. It has a clean
four-layer architecture, a swappable database seam, pure/testable domain services, branded
ID types, soft deletes, sync-ready row metadata, a thoughtful responsive theme system, and
design comments that explain *why* non-obvious choices were made. `tsc --strict`
(with `noUncheckedIndexedAccess`) passes with zero errors.

The biggest real gap is the **absence of an automated test suite** — which is also the
main thing standing between "good" and "confidently shippable." See
[docs/TESTING.md](docs/TESTING.md).

### Two myths, corrected

The review explicitly checked the two scariest claims and found them false:

- **"All mock implementations" / "the calendar code is mocked."** There are **no mocks** in
  the codebase. `AppleCalendarProvider` uses the real `expo-calendar` API; ICS export uses
  the real `expo-file-system` `File`/`Paths` API (the SDK 54+ synchronous API — verified
  present in `node_modules`), `expo-sharing`, and a correct web `Blob` download fallback;
  the email generator uses real `expo-clipboard`. Nothing was stubbed, so nothing needed
  "replacing with a production implementation."
- **"SQL injection via LIMIT/OFFSET interpolation."** The pagination values are
  type-guarded to `number` before interpolation, so there's no injection vector. (It could
  still be parameterized for style; low priority.)

---

## Changes made in this pass

Small, safe, high-confidence improvements — all verified by `npm run typecheck` (exit 0).

| # | Category | Change |
| --- | --- | --- |
| 1 | **Duplication** | Added `src/shared/hooks/useFormSubmit.ts` and wired it into all five form modals (Student/Session/Payment/Assignment/Template). Removes the repeated `submitting` + `formError` + Result-handling boilerplate and **fixes a latent bug**: a thrown submit action previously left the form stuck in the loading state; the hook always clears `submitting` in `finally`. The Session modal keeps its best-effort calendar sync inside the success callback. |
| 2 | **Type safety** | Replaced inline `import('../types/common').XId` generic arguments in `domain/repositories/index.ts` with proper top-level imports (`AssignmentId`, `ChecklistItemId`, `PaymentId`, `EmailTemplateId`). Clearer and refactor-safe. |
| 3 | **Folder org / dead code** | Removed `src/examples/` (4 unreferenced files — design-system showcase and scaffolding with zero imports outside the folder) and fixed the now-stale reference in `App.tsx`. |

---

## Findings deliberately **not** changed (and why)

A senior review is also about restraint: not churning working, deliberately-designed,
**untested** code. These were considered and intentionally deferred — they're tracked in
[docs/ROADMAP.md](docs/ROADMAP.md#technical-roadmap-from-the-code-review).

- **Generic Zustand store factory.** The 8 stores do share a `byId`/`order` CRUD shape, and
  a `createCrudStore` factory would cut duplication. But it's a broad refactor across the
  app's state core with **no tests to catch regressions**. Right move: write tests first,
  then refactor. Deferred.
- **`TextField` web focus ring.** The component header documents that keeping focus state
  triggers a re-render that races with native focus on the New Architecture and blurs the
  field. The "add a focus ring" suggestion was already considered and rejected for a real
  reason; a non-rerender approach is the correct future fix, not reverting the decision.
- **Immer middleware / EventEmitter cross-store bus.** Over-engineering for the current data
  volumes; adds dependencies and indirection without a demonstrated need.
- **"Remove branded-type assertions in mappers."** The write path validates via the
  validation layer; the read path trusts the DB it owns. Re-validating every row read is a
  defensible *option*, not a correctness bug, and adds cost on every query.
- **`paymentsStore.forStudent` O(n) rebuild.** Real, but immaterial at a tutor's data scale.
  Scheduled in the roadmap (add a `byStudent` index) rather than done speculatively.
- **Database indexes.** Already well-designed: partial indexes (`WHERE deleted_at IS NULL`)
  on every foreign key and on session dates. No change needed.

---

## Category-by-category summary

1. **Architecture** — Strong. Clean layering, DI container, repository contracts as the sync
   seam, pure domain services. Minor: some screens hold small bits of action logic that
   could become feature hooks as they grow.
2. **Duplicated code** — The main offender (form-modal submit boilerplate) is now removed via
   `useFormSubmit`. Remaining duplication (store CRUD shape) is deferred behind tests.
3. **Performance** — No hot-path problems at expected scale. Watch items (selector array
   rebuilds, `forStudent`) are roadmapped.
4. **Mobile responsiveness** — Good: a `useResponsive` system, bottom-sheet-on-phone modals,
   max-width containers, `hideOnCompact` columns. Polish: a couple of fixed sizes could scale.
5. **Desktop/web** — Works via react-native-web with hover states. Gap: keyboard focus
   visibility (see the deliberate `TextField` note); roadmapped.
6. **Accessibility** — Better than typical: roles, `accessibilityState`, and labels on most
   interactive components. Polish: derived labels on `Select` triggers and table rows,
   contrast audit. Roadmapped.
7. **Type safety** — Excellent baseline (strict + `noUncheckedIndexedAccess`, branded IDs).
   Tidied the inline-import generics.
8. **Database efficiency** — Solid: WAL, FKs on, partial indexes, parameterized queries,
   transactions available. Future: batched writes for seeding/sync.
9. **Component reusability** — A real design system (`shared/ui`) with primitives, widgets,
   and feedback states. Some components are tightly coupled (Select↔Modal) by design;
   acceptable.
10. **Folder organization** — Consistent feature + layer structure. Dead `examples/` removed;
    added `shared/hooks/`.

## Recommended next step

Land the test infrastructure from [docs/TESTING.md](docs/TESTING.md). Once the domain and
repository layers are covered, the deferred refactors (store factory, focus affordance) can
be done safely.
