# EasyTutor

A local-first tutoring CRM for independent tutors and small tutoring businesses. Track
students, schedule sessions, manage assignments and session checklists, bill and record
payments, view revenue analytics, sync sessions to the device calendar, and generate
parent/student emails from reusable templates.

Built with Expo + React Native, EasyTutor runs from a single codebase on **iOS, Android,
and the web**. All data lives on-device in SQLite — no server, no network required. Users
sign into **local, password-protected accounts**, each with its own database, so different
tutors keep separate data on the same device/browser.

> New to this codebase? Start with **[CLAUDE.md](CLAUDE.md)** — it's the up-to-date
> orientation (architecture, conventions, gotchas) for adding features or fixing bugs.

---

## Highlights

- **Local accounts** — password-protected sign-in; each account keeps its own separated data on the device/browser (no server).
- **Students** — profiles with grade, school, parent contacts, default rate & duration, and status (active/paused/archived).
- **Sessions** — month-view scheduling, a per-platform time picker, per-session rate/duration, status (scheduled/completed/cancelled/no-show), notes, assignments, and a completion checklist (with customizable app-wide default items).
- **Session history quick actions** — change status from a color-coded dropdown, mark complete/cancel, mark/unmark paid, and delete — right from a student's history.
- **Payments** — auto-calculated amounts from a session's rate × duration, pending/paid tracking, one-tap billing from completed sessions, and quick delete.
- **Revenue dashboard** — earnings totals, outstanding balances, and per-student breakdowns.
- **Calendar sync** — add/update/remove sessions in the OS calendar (`expo-calendar`) with configurable alerts/reminders (and customizable defaults), or export a standard `.ics` file to any calendar app.
- **Email templates** — reusable templates with variable tokens (incl. `session_time`), a live preview, and one-tap generation + clipboard copy from real session data.
- **SAT Mode** — a settings flag that adapts event titles and copy for SAT-focused tutoring.
- **Theming** — light/dark/system, a responsive layout system, and an accessible shared UI kit.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Runtime | [Expo](https://expo.dev) SDK 56, React Native 0.85 (New Architecture) |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Navigation | React Navigation (native stack) |
| State | [Zustand](https://github.com/pmndrs/zustand) stores over a repository layer |
| Persistence | `expo-sqlite` (WAL, foreign keys on) with a versioned migration runner |
| Platform APIs | `expo-calendar`, `expo-file-system`, `expo-sharing`, `expo-clipboard`, `expo-crypto` |

---

## Quick start

```bash
npm install
npm start          # Expo dev server — press i / a / w for iOS, Android, web
```

Platform shortcuts:

```bash
npm run ios        # build & run the iOS app (requires Xcode)
npm run android    # build & run the Android app (requires Android Studio)
npm run web        # run in the browser
npm run typecheck  # tsc --noEmit
```

See **[docs/SETUP.md](docs/SETUP.md)** for prerequisites and platform setup, and
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for shipping to the App Store, Play Store,
and the web.

---

## Architecture at a glance

EasyTutor follows a clean, four-layer architecture so the UI never talks to SQLite
directly and the storage layer stays swappable (a future cloud-sync client is a drop-in
replacement). Full rationale lives in **[architecture.md](architecture.md)**.

```
┌─────────────────────────────────────────────────────────────┐
│  features/            Screens + feature components (UI)       │
│  shared/ui            Reusable design-system components       │
├─────────────────────────────────────────────────────────────┤
│  store/               Zustand stores (reactive cache + actions)│
├─────────────────────────────────────────────────────────────┤
│  domain/              Types, repository contracts, pure        │
│                       business services (earnings, payments,   │
│                       calendar, templates)                     │
├─────────────────────────────────────────────────────────────┤
│  data/                SQLite client, repositories, mappers,    │
│                       migrations, seed                         │
│  integrations/        Calendar providers (Apple/ICS)           │
│  app/                 DI container, providers, navigation      │
└─────────────────────────────────────────────────────────────┘
```

**Key seams**

- **Repository contracts** (`domain/repositories`) are interfaces; `data/repositories`
  provides the SQLite implementations, wired via a small DI container (`app/di`).
- **Domain services** (`domain/services`) are pure functions — no I/O, fully unit-testable.
- **Database client** (`data/db/client`) is an interface, so the data layer can be backed
  by an in-memory client for tests or a synced client later.

### Source layout

```
src/
  app/            Composition root: DI container, providers (incl. AuthGate), navigation
  auth/           Local-account registry DB + password hashing
  data/           SQLite client, migrations, repositories, mappers, seed
  domain/         Types, repository contracts, pure business services
  features/       Feature screens & modals (students, sessions, payments, templates, auth)
  integrations/   Calendar providers (Apple Calendar, ICS export)
  shared/         Theme, responsive system, UI kit, hooks, utils, validation
  store/          Zustand stores (one per aggregate, + authStore)
```

### Screens

`StudentsList` (home) → `StudentDetail` → `SessionDetail`; plus `Payments`,
`RevenueDashboard`, and `Templates`. Routes and params are defined in
`src/app/navigation/types.ts`. Deep linking uses the `easytutor://` scheme.

---

## Data & privacy

All records are stored locally in SQLite. Each account has its own tutoring database; a
small `easytutor-accounts.db` registry holds accounts (passwords hashed with salted
SHA-256 via `expo-crypto`) and the active-account pointer. Soft deletes (tombstones) and
per-row sync metadata are already in the schema so cloud sync can be added without a
migration. The app requests calendar permission only when you choose to sync a session; no
analytics or network calls are made.

> Local-only trade-offs: data lives only on that device/browser — it doesn't sync across
> devices, and there's no password recovery. Cross-device sync is the "cloud sync" roadmap item.

---

## Documentation

| Doc | What's in it |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | **Start here** — up-to-date orientation, conventions & gotchas for contributors |
| [architecture.md](architecture.md) | Architecture & design rationale (original design doc) |
| [docs/schema.md](docs/schema.md) | Schema *design* doc (as-built schema lives in the migrations) |
| [docs/navigation.md](docs/navigation.md) | Navigation map |
| [docs/SETUP.md](docs/SETUP.md) | Environment setup & running locally |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Building & releasing (EAS, web) |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy & plan |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Planned features & technical roadmap |
| [REVIEW.md](REVIEW.md) | Senior code-review findings & follow-ups |

## License

See [LICENSE](LICENSE).
