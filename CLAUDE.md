# CLAUDE.md

Orientation for working in this repo. This describes the **as-built** code and is the
source of truth for conventions. (`architecture.md` and `docs/schema.md` are earlier
*design* docs and have diverged — see the banners on those files.)

## What this is

**EasyTutor** — a local-first tutoring CRM built with Expo + React Native (TypeScript),
running from one codebase on **iOS, Android, and web** (react-native-web). All data lives
on-device in SQLite; there is no backend. Users sign into **local accounts**, each with its
own database (see "Multi-account" below).

## Commands

```bash
npm run typecheck   # tsc --noEmit — ALWAYS run after changes; CI of last resort (no tests yet)
npm start           # Expo dev server (press i / a / w)
npm run web         # web build
npm run ios|android # native builds (need Xcode / Android Studio)
```

There is **no automated test suite yet** (see `docs/TESTING.md` for the plan). `typecheck`
is strict (`noUncheckedIndexedAccess`, `noUnusedLocals`) — it catches a lot; treat a clean
`typecheck` as the bar before committing. Commit only when the user asks; this repo commits
to `main`.

## Architecture (four layers — never skip one)

```
features/ + shared/ui   UI (screens, feature modals, design-system components)
        │  (calls)
store/                  Zustand stores: reactive cache + actions, one per aggregate
        │  (calls getRepositories() at ACTION time)
domain/                 Types, repository INTERFACES, pure services (no I/O)
        │  (implemented by)
data/                   SQLite client, repositories, mappers, migrations, seed
app/                    Composition root: DI container, providers, navigation
integrations/           Calendar providers (Apple device calendar, ICS export)
auth/                   Local-account registry DB + password hashing
```

Hard rules:
- UI talks to **stores**, never to repositories or SQLite directly.
- Stores depend on repository **interfaces** (`domain/repositories`) via
  `getRepositories()` from `src/app/di/container.ts`, called **inside actions** (not at
  module load) — this is what lets the active database be swapped per account at runtime.
- `domain/services/*` are **pure** (no I/O, no `Date.now()` — time is passed in). Put
  business logic here, not in stores or screens.
- Fallible operations return `Result<T>` (`ok()/err()` from `src/shared/utils/result.ts`),
  they don't throw across layers. Errors are values.
- IDs are **branded types** (`StudentId`, `SessionId`, …) from `domain/types/common.ts`.

## Multi-account / auth (important — added after the original design)

- A separate registry DB **`easytutor-accounts.db`** (`src/auth/accountsDb.ts`) holds the
  account list (salted SHA-256 via `expo-crypto`, in `src/auth/crypto.ts`) and the active
  account pointer. Each account owns its **own** tutoring DB; the **first** account adopts
  the legacy default `tutor.db` so pre-login data is preserved, later accounts get
  `tutor-<uuid>.db`.
- `src/store/authStore.ts` — `bootstrap` (restore last account on launch), `register`,
  `login`, `logout`. Switching accounts calls `resetAllStores()` (`src/store/reset.ts`) then
  `reinitContainer(dbName)` (`src/app/di/container.ts`), which closes the old DB and opens
  the account's.
- `src/app/providers/AuthGate.tsx` gates the tree: spinner → login/register → app.
- **When adding a store, add it to `resetAllStores()`** or its data will leak across accounts.

## Data model (as built — `src/data/db/migrations/` is the source of truth)

Tables: `students`, `sessions`, `assignments`, `checklist_items`, `payments`,
`email_templates`, `sat_scores`, `sat_skill_performance` (migration 0001);
`calendar_links`, `settings` singleton (0002); `students.parent_name` (0003);
`settings.default_checklist_items` (0004); `settings.default_calendar_alerts` (0005).
Plus the accounts registry DB (`accounts`, `meta`).

Conventions: snake_case columns ↔ camelCase entities (only in `data/mappers/index.ts`);
soft delete via `deleted_at`; per-row `sync_status`/`server_rev` (reserved for future sync);
booleans as 0/1; timestamps as integer epoch ms; JSON arrays stored as TEXT.

Repositories (`domain/repositories/index.ts` interfaces, `data/repositories/index.ts`
impls): students, sessions, assignments, checklistItems, payments, calendarLinks, settings,
emailTemplates, satScores, satSkillPerformance. Most extend `BaseSqliteRepository`
(generic CRUD + validation); `settings` is a bespoke singleton.

## Screens & navigation

Native stack (`src/app/navigation/`): `StudentsList` (home) → `StudentDetail` →
`SessionDetail`; plus `Payments`, `RevenueDashboard`, `Templates`. URL scheme `easytutor://`.
Auth screens live in `src/features/auth/` and render via `AuthGate`, not the stack.

## How to add / change things (follow existing patterns)

**New entity (end-to-end):** type in `domain/types/` → migration `000N_*.ts` (+ register in
`migrations/index.ts`) → mapper in `data/mappers/index.ts` → repository interface + impl →
Zustand store (+ export in `store/index.ts`, + reset in `store/reset.ts`) → screen/modal.

**New migration:** append-only, never edit shipped ones. Add `src/data/db/migrations/000N_desc.ts`
and register it; the runner uses `PRAGMA user_version`.

**New app-wide setting:** add to `AppSettings`/`SettingsPatch` (`domain/types/settings.ts`),
the `settingsMapper` (both directions, with a JSON helper for arrays), the repo `get()`
defaults (`data/repositories/index.ts`), and `settingsStore.ts`; add a migration for the
column. (See `defaultChecklistItems` / `defaultCalendarAlerts` as worked examples.)

**Forms / modals:** reuse `useFormSubmit` (`src/shared/hooks`) for the submitting/error/Result
lifecycle, and the UI kit (`src/shared/ui`: `Button`, `Card`, `TextField`, `Select`, `Modal`,
`TimeField`, `Switch`, `DataTable`, `Badge`, primitives `VStack`/`HStack`/`Text`). Responsive
via `useResponsive()` (`isCompact`, `select(...)`); theme via `useTheme()`.

**Calendar:** sessions are the source of truth and push out via a `CalendarProvider`
(`integrations/calendar/`). Per-session/default alerts flow through `CalendarEventDraft.alarms`
→ provider (`relativeOffset` / ICS `VALARM`).

## Gotchas (these have bitten us repeatedly)

- **Form modals are mounted once and toggled `visible`** — so `useState(initialFromProps)`
  runs only on first mount and shows STALE/blank data when reopened for a different record.
  Every form modal MUST re-sync its fields in a `useEffect(..., [visible, record, ...])`.
  This was the root cause of multiple "edit form is blank / shows old values" bugs
  (Session/Assignment/Payment/Template modals). Always add the re-sync effect.
- **Web SQLite headers:** `expo-sqlite` on web (WASM) generally needs cross-origin isolation
  (`COOP: same-origin` + `COEP: require-corp`). GitHub Pages can't set these — deploy web to
  a host that can (Cloudflare Pages / Netlify). See `docs/DEPLOYMENT.md`.
- **Web nested-Pressable double-fire:** `DataTable` rows are `Pressable` (`onRowPress`); an
  in-row button can also bubble the row press on react-native-web. Be deliberate about
  in-row actions vs. row navigation.
- **Password hashing is salted SHA-256**, not a slow KDF — acceptable only because it's a
  local, offline, no-server app (no `expo-secure-store`). Don't reuse this for a server.
- Stores cache by id; after a cross-account switch, stale data must be cleared via
  `resetAllStores()`.

## Docs

`docs/SETUP.md` (run locally) · `docs/DEPLOYMENT.md` (ship) · `docs/TESTING.md` (test plan) ·
`docs/ROADMAP.md` · `REVIEW.md` (review findings). `architecture.md` and `docs/schema.md`
are original design docs — useful for rationale, but verify against the code/migrations.
