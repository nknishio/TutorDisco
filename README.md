# EasyTutor

A local-first tutoring CRM for independent tutors and small tutoring businesses. Track
students, schedule sessions, manage assignments and session checklists, bill and record
payments, view revenue analytics, sync sessions to the device calendar, and generate
parent/student emails from reusable templates.

Built with Expo + React Native, EasyTutor runs from a single codebase on **iOS, Android,
and the web**. All data lives on-device in SQLite — no account, no server, no network
required.

---

## Highlights

- **Students** — profiles with grade, school, parent contacts, default rate & duration, and status (active/paused/archived).
- **Sessions** — month-view scheduling, per-session rate/duration, status (scheduled/completed/cancelled/no-show), notes, assignments, and a completion checklist.
- **Payments** — auto-calculated amounts from a session's rate × duration, pending/paid tracking, and one-tap billing from completed sessions.
- **Revenue dashboard** — earnings totals, outstanding balances, and per-student breakdowns.
- **Calendar sync** — add/update/remove sessions in the OS calendar (`expo-calendar`) or export a standard `.ics` file to any calendar app.
- **Email templates** — reusable templates with variable tokens, a live preview, and one-tap generation + clipboard copy from real session data.
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
  app/            Composition root: DI container, providers, navigation
  data/           SQLite client, migrations, repositories, mappers, seed
  domain/         Types, repository contracts, pure business services
  integrations/   Calendar providers (Apple Calendar, ICS export)
  shared/         Theme, responsive system, UI kit, hooks, utils, validation
  store/          Zustand stores (one per aggregate)
```

### Screens

`StudentsList` (home) → `StudentDetail` → `SessionDetail`; plus `Payments`,
`RevenueDashboard`, and `Templates`. Routes and params are defined in
`src/app/navigation/types.ts`. Deep linking uses the `easytutor://` scheme.

---

## Data & privacy

All records are stored locally in SQLite. Soft deletes (tombstones) and per-row sync
metadata are already in the schema so cloud sync can be added without a migration. The
app requests calendar permission only when you choose to sync a session; no analytics or
network calls are made.

---

## Documentation

| Doc | What's in it |
| --- | --- |
| [architecture.md](architecture.md) | Full architecture & design rationale |
| [docs/schema.md](docs/schema.md) | Database schema reference |
| [docs/navigation.md](docs/navigation.md) | Navigation map |
| [docs/SETUP.md](docs/SETUP.md) | Environment setup & running locally |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Building & releasing (EAS, web) |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy & plan |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Planned features & technical roadmap |
| [REVIEW.md](REVIEW.md) | Senior code-review findings & follow-ups |

## License

See [LICENSE](LICENSE).
