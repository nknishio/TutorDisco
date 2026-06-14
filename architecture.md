# Tutoring CRM — Architecture

> **Status:** Design phase. No feature code yet. This document, the schema design,
> the type definitions, and the navigation map are the contract the implementation
> will be built against.

---

## 1. Product summary

A tutoring management app (CRM) for independent tutors and small tutoring
businesses. The primary use case is **SAT tutoring**, but the product must work
equally well for general tutoring (math, languages, music, test prep of any kind).

The defining product decision is a single global setting:

```
Settings → SAT Mode → [ On | Off ]
```

When **SAT Mode is on**, SAT-specific surfaces appear (practice-test score
tracking, section/skill breakdowns, target-score progress). When **off**, the app
is a clean general-purpose tutoring CRM and none of the SAT machinery is visible.

SAT Mode is a **presentation + capability flag**, never a data partition. SAT data
is always stored; the flag only governs what the UI exposes. This keeps the data
model stable, makes the toggle reversible with zero data loss, and means a tutor
who flips SAT Mode off and back on still has all their score history.

---

## 2. Architectural goals & the forces behind them

| Goal | Why it matters here | What it forces |
|------|--------------------|----------------|
| **Offline-first** | Tutors log sessions on phones between lessons, often with no signal. | SQLite as the source of truth; UI reads from local DB, never blocks on network. |
| **Cloud-sync-ready (future)** | Tutors switch devices (phone in session, desktop for billing). | UUID primary keys, soft deletes, per-row sync metadata, monotonic clocks — designed in from day one even though sync ships later. |
| **One codebase, three targets** | iOS + desktop web now, Android later. | Expo + React Native Web; zero platform-specific business logic; platform code isolated behind interfaces. |
| **SAT Mode without forking the app** | SAT is the hero use case but cannot bloat the general path. | Capability flag + feature-gated navigation and components, not separate builds. |
| **Strong typing end to end** | A CRM is a data-integrity product; silent type drift corrupts client records. | TypeScript `strict`, branded ID types, exhaustive unions, DB↔domain mappers with no `any`. |
| **Modular & testable** | Solo-founder velocity today, team velocity later. | Clean architecture layering + feature modules; domain logic has no framework imports. |

---

## 3. Clean architecture — the four layers

We use a pragmatic Clean Architecture. The rule that matters: **dependencies point
inward**. The domain knows nothing about SQLite, Zustand, React, or Expo. The outer
layers depend on the inner ones, never the reverse.

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION  screens · components · navigation · theme      │
│  (React Native + RN Web. Knows about Zustand stores only.)    │
└───────────────▲───────────────────────────────────────────────┘
                │ calls use-cases / reads selectors
┌───────────────┴───────────────────────────────────────────────┐
│  APPLICATION   Zustand stores · use-cases (services)           │
│  (Orchestrates domain + data. No JSX, no SQL.)                 │
└───────────────▲───────────────────────────────────────────────┘
                │ depends on repository *interfaces*
┌───────────────┴───────────────────────────────────────────────┐
│  DOMAIN        entities · value objects · repository contracts │
│  (Pure TypeScript. ZERO external imports. The stable core.)    │
└───────────────▲───────────────────────────────────────────────┘
                │ implements the contracts above
┌───────────────┴───────────────────────────────────────────────┐
│  DATA          SQLite client · repositories · mappers ·        │
│                migrations · (future) sync engine               │
└─────────────────────────────────────────────────────────────────┘
```

### Why this exact layering

- **The domain is dependency-free on purpose.** Entities and the repository
  *interfaces* live in `src/domain`. They import nothing from Expo, SQLite, or
  React. This is what lets us (a) unit-test business rules with no test harness,
  (b) swap SQLite for a synced backend later without touching a single rule, and
  (c) keep the type definitions (deliverable #3) as the single source of truth.

- **Repositories are interfaces in the domain, implementations in data.** The
  application layer depends on `StudentRepository` (an interface). At app start we
  inject the concrete `SqliteStudentRepository`. When cloud sync arrives, we inject
  a `SyncedStudentRepository` that wraps SQLite + a remote — and nothing upstream
  changes. This is the single most important seam for the "future cloud sync"
  requirement.

- **Use-cases sit between stores and repositories.** A use-case is a plain async
  function expressing one piece of business intent (`logSession`, `recordSatScore`,
  `archiveStudent`). Stores call use-cases; use-cases call repositories. This keeps
  Zustand stores thin (UI state + dispatch) and keeps business logic out of
  components, where it's hard to test and easy to duplicate.

> **Pragmatic note:** for trivial CRUD we allow stores to call repositories
> directly. Use-cases are introduced only where there's real logic (multi-entity
> writes, validation, SAT score computation, billing math). We don't create empty
> pass-through use-cases for ceremony.

---

## 4. Folder structure

A **hybrid** of clean-architecture layers and feature modules. Cross-cutting
concerns live in layer folders (`domain`, `data`, `shared`); user-facing surfaces
live in `features/`. This is the structure that scales: a developer working on
billing touches `features/billing` and rarely anything else.

```
src/
├── app/                          # Composition root — wires everything together
│   ├── App.tsx                   # Root component
│   ├── providers/                # Theme, DB, Store, SafeArea, Gesture providers
│   │   ├── AppProviders.tsx
│   │   ├── DatabaseProvider.tsx  # Opens DB, runs migrations, exposes client
│   │   └── ThemeProvider.tsx
│   ├── navigation/               # See navigation.md
│   │   ├── RootNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   ├── linking.ts            # Deep-link / URL config for web
│   │   └── routes.ts             # Typed route names + param lists
│   └── di/                       # Dependency injection container
│       └── container.ts          # Builds repositories, injects into stores
│
├── domain/                       # ← INNERMOST. Pure TS. No external imports.
│   ├── entities/                 # Student, Session, SatScore, Invoice, ...
│   ├── value-objects/            # Money, DateRange, ScaledScore, ContactInfo
│   ├── repositories/             # Repository INTERFACES (contracts)
│   ├── services/                 # Pure domain services (SAT score math, billing)
│   └── types/                    # Shared domain types, branded IDs, unions
│
├── data/                         # Implements domain contracts
│   ├── db/
│   │   ├── client.ts             # expo-sqlite wrapper, typed query helpers
│   │   ├── schema.sql            # Canonical DDL (mirrors docs/schema.md)
│   │   ├── migrations/           # Ordered, versioned migrations
│   │   │   ├── index.ts          # Migration runner
│   │   │   └── 0001_init.ts
│   │   └── seed/                 # Dev/demo seed data
│   ├── repositories/             # SqliteStudentRepository, etc.
│   ├── mappers/                  # Row (snake_case) ↔ Entity (camelCase)
│   └── sync/                     # (FUTURE) sync engine — empty interface today
│       └── SyncEngine.ts
│
├── features/                     # Feature modules (presentation + local glue)
│   ├── students/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts              # Public surface of the module
│   ├── sessions/
│   ├── schedule/
│   ├── billing/
│   ├── sat/                      # SAT-only feature module (gated by SAT Mode)
│   │   ├── screens/              # SatDashboard, ScoreEntry, SkillBreakdown
│   │   ├── components/
│   │   └── index.ts
│   ├── dashboard/                # Home / overview
│   └── settings/                 # Includes the SAT Mode toggle
│
├── store/                        # Zustand stores (application layer)
│   ├── createStore.ts            # Store factory w/ devtools + persistence wiring
│   ├── settingsStore.ts          # Holds SAT Mode + theme prefs (persisted)
│   ├── studentsStore.ts
│   ├── sessionsStore.ts
│   ├── billingStore.ts
│   ├── satStore.ts
│   └── index.ts
│
├── shared/                       # Cross-cutting, framework-aware utilities
│   ├── ui/                       # Reusable component library (see §7)
│   │   ├── primitives/           # Box, Text, Stack, Pressable
│   │   ├── components/           # Button, Card, Input, Select, Badge, Modal...
│   │   ├── feedback/             # Toast, EmptyState, Skeleton, ErrorBoundary
│   │   └── index.ts
│   ├── theme/                    # Theme system (see §6)
│   │   ├── tokens.ts             # Raw design tokens
│   │   ├── lightTheme.ts
│   │   ├── darkTheme.ts
│   │   ├── ThemeContext.ts
│   │   └── useTheme.ts
│   ├── hooks/                    # useResponsive, useDebounce, useAsync...
│   ├── responsive/               # Breakpoints + responsive helpers
│   ├── i18n/                     # (future) localization scaffold
│   ├── utils/                    # date, currency, id (uuid), result/Either
│   └── config/                   # env, feature flags, constants
│
└── test/                         # Test utilities, fixtures, in-memory DB
```

### Why feature modules *and* layers

A pure-layered structure (`screens/`, `components/`, `hooks/` at top level) doesn't
scale — every change touches four folders. A pure feature structure buries the
shared domain. The hybrid gives us: **stable shared core** (`domain`, `data`,
`shared`) + **independently evolvable surfaces** (`features/*`). Deleting a feature
is deleting one folder. Adding Android touches only `shared/ui` platform files.

### The SAT module is a first-class, isolated feature

`features/sat` is the *only* place SAT screens live. Navigation conditionally
mounts it based on `settingsStore.satMode`. If we ever spin SAT into a separate
product, it lifts out cleanly. General tutoring never imports from it.

---

## 5. Local storage strategy

### 5.1 SQLite is the source of truth

We use **`expo-sqlite`** (its modern async API). All persistent business data —
students, sessions, scores, invoices — lives in SQLite. The UI **never** reads
SQLite directly; it reads Zustand stores, which are hydrated from repositories.

```
UI (components)
   └─ reads ─▶ Zustand store (in-memory, reactive)
                  └─ hydrated by ─▶ Repository (interface)
                                       └─ implemented by ─▶ SQLite
```

**Why SQLite over AsyncStorage / MMKV / WatermelonDB:**
- A CRM is **relational** (students↔sessions↔invoices↔scores). Key-value stores
  force us to hand-roll joins and indexes. SQLite gives us real queries, foreign
  keys, and indexes for free.
- It's the documented offline backbone for sync engines (the future requirement).
- `expo-sqlite` runs natively on iOS/Android and via a WASM build on web — **one
  storage API across all three targets**, which is exactly our platform goal.
- WatermelonDB is excellent but heavier and opinionated; we keep the dependency
  surface small and the schema explicit so the future sync engine is ours to shape.

### 5.2 Two storage tiers

| Tier | Tech | Holds | Why |
|------|------|-------|-----|
| **Relational data** | `expo-sqlite` | Students, sessions, scores, invoices, notes | Needs queries, relations, integrity. |
| **Lightweight prefs** | Zustand `persist` (AsyncStorage on native, `localStorage` on web) | SAT Mode, theme, onboarding flags, last-selected filters | Tiny, non-relational, read on boot, must survive restart. No reason to hit SQLite. |

> **SAT Mode lives in the prefs tier**, persisted via Zustand. It's read
> synchronously on boot so navigation can decide what to mount with no flash.

### 5.3 Migrations

Schema version is tracked in SQLite's `PRAGMA user_version`. On boot,
`DatabaseProvider` runs all migrations with a version higher than the stored one,
in order, inside a transaction. Migrations are **append-only and never edited
after shipping** — the only safe contract for user devices in the field.

### 5.4 Designed for sync (even though sync ships later)

Every business row carries sync-ready metadata from day one (see schema):

- **UUID primary keys** (`TEXT`), generated client-side — no autoincrement
  collisions when two offline devices both insert.
- **`created_at` / `updated_at`** as UTC epoch-millis integers — monotonic,
  timezone-free, trivially comparable for last-write-wins.
- **`deleted_at`** soft deletes — a hard delete can't propagate through sync; a
  tombstone can.
- **`sync_status`** (`'synced' | 'pending' | 'conflict'`) and **`server_rev`** —
  the hooks a future sync engine needs, dormant until then.

Today the repositories just set `updated_at` and leave `sync_status = 'pending'`.
The day we add `data/sync/SyncEngine.ts`, the data is already in the right shape.

---

## 6. Theme system

A **token-based** theme with light/dark support and a runtime context. Goals:
consistency, dark mode, and a single place to retheme.

```
tokens.ts            # primitive scales: color ramps, spacing, radii, font sizes
   │
   ├─ lightTheme.ts  # semantic mapping: surface, onSurface, primary, danger...
   └─ darkTheme.ts   # same semantic keys, different primitive values
        │
   ThemeProvider ──▶ useTheme() ──▶ components consume SEMANTIC tokens only
```

**Design decisions:**

- **Two-level tokens: primitive → semantic.** Components reference
  `theme.colors.surface`, never `tokens.gray800`. Rebranding = editing the semantic
  map; the entire app follows. This is what makes the theme swappable.
- **Semantic naming** (`primary`, `surface`, `onSurface`, `danger`, `success`,
  `muted`) instead of literal colors. Dark mode is then just a second mapping of the
  same keys — no component knows which theme is active.
- **Spacing/radius/typography scales** are numeric tokens (`spacing(2)` → 8px) so
  layouts stay on a rhythm and responsive scaling is centralized.
- **Theme via React Context, not inline StyleSheet constants.** Lets us switch
  light/dark at runtime and (future) honor OS appearance. `useTheme()` returns the
  active theme object; a `makeStyles(theme => …)` helper memoizes per-theme styles.
- **No external UI kit** (no NativeBase/Tamagui lock-in for v1). We own a small
  primitive set so RN Web behavior is predictable across our three targets. We can
  adopt one later behind the same `shared/ui` surface.

---

## 7. Reusable component library (`shared/ui`)

Three tiers, smallest-to-largest, so composition is obvious and the dependency
graph stays acyclic:

1. **Primitives** — `Box`, `Stack` (V/H), `Text`, `Pressable`. Thin wrappers over
   RN with theme-aware style props. Everything else is built from these.
2. **Components** — `Button`, `Card`, `TextField`, `Select`, `Badge`, `Avatar`,
   `Modal`, `ListItem`, `Tabs`, `SegmentedControl`, `DatePicker`. Fully themed,
   variant-driven (`variant="primary" | "ghost" | "danger"`), accessible.
3. **Feedback** — `EmptyState`, `Skeleton`, `Toast`, `ErrorBoundary`,
   `ConfirmDialog`. The states a real CRM needs but apps usually skip.

**Decisions:**
- **Variants over one-off props.** `<Button variant tone size>` instead of a dozen
  booleans. Keeps the API small and the visual language consistent.
- **Controlled, typed, accessible.** Every input is controlled, every component has
  an explicit prop type, interactive elements set accessibility roles/labels.
- **Responsive by default.** Components consume the responsive system (§8) rather
  than hard-coding sizes, so the same `<Card>` looks right on a phone and a 1440px
  desktop browser.

---

## 8. Responsive layout strategy

Three breakpoints, driven by width:

| Token | Min width | Target | Layout shape |
|-------|----------|--------|--------------|
| `compact` | 0 | Phone (iOS) | Single column, bottom tab bar |
| `medium` | 768 | Tablet / small web | Two-pane where useful |
| `expanded` | 1024 | Desktop browser | Sidebar nav + master-detail |

- **`useResponsive()`** hook returns the active breakpoint + helpers
  (`isCompact`, `value({compact, medium, expanded})`). One source of truth for
  adaptive decisions.
- **Navigation adapts to width, not platform.** Bottom tabs on `compact`; a
  persistent left sidebar (rail) on `expanded`. A desktop browser narrowed to phone
  width behaves like a phone — width is the signal, not OS. (Detail in
  `navigation.md`.)
- **Master-detail on wide screens.** On `expanded`, list + detail render side by
  side (e.g. student list | student profile). On `compact` they're separate pushed
  screens. Same screens, composed differently by the layout shell.

---

## 9. State management (Zustand)

- **One store per bounded context** (`settings`, `students`, `sessions`, `billing`,
  `sat`) rather than a single god store — smaller surfaces, fewer re-renders,
  easier testing.
- **Stores are the application layer.** They hold UI/in-memory state and call
  use-cases/repositories. They contain no JSX and no SQL.
- **Selectors everywhere.** Components subscribe to slices
  (`useStudentsStore(s => s.byId[id])`) to avoid over-rendering.
- **Persistence is selective.** Only `settingsStore` is persisted (SAT Mode, theme).
  Entity stores are hydrated from SQLite on demand — SQLite is the truth, the store
  is a reactive cache.
- **DI via the container.** `app/di/container.ts` constructs repositories and hands
  them to stores at startup, so stores depend on interfaces, not concrete SQLite.

---

## 10. SAT Mode — how the flag flows through the layers

| Layer | Behavior when SAT Mode is **on** | when **off** |
|-------|----------------------------------|--------------|
| **Settings store** | `satMode: true` (persisted) | `satMode: false` |
| **Navigation** | Mounts the `SAT` tab/route + SAT entries in student detail | Those routes are not registered |
| **Components** | SAT widgets render (score chart, target progress) | Gated out via `if (!satMode) return null` at module boundary |
| **Domain/Data** | SAT tables & types always present; reads/writes allowed | **Unchanged** — SAT data is preserved, just not surfaced |

**Key decision: the flag gates presentation, not persistence.** Turning SAT Mode
off never deletes scores. This makes the toggle safe, reversible, and demo-friendly,
and keeps the schema invariant across modes.

---

## 11. Technology decisions at a glance

| Concern | Choice | One-line rationale |
|---------|--------|--------------------|
| Runtime | Expo (managed) | Fastest path to iOS + web now, Android later, with OTA updates. |
| Language | TypeScript `strict` | Data-integrity product; types are the spec. |
| Web | React Native Web | One component tree across iOS/web/Android. |
| DB | expo-sqlite | Relational, offline-first, same API on all targets. |
| State | Zustand | Minimal boilerplate, selector-based, easy to test, persist middleware. |
| Navigation | React Navigation | Mature, typed, first-class deep-linking for web URLs. |
| IDs | UUID v4 (client) | Offline-safe, sync-ready, no autoincrement collisions. |
| Dates | UTC epoch millis (int) | Timezone-free storage, trivial comparison for sync. |
| Money | Integer minor units | Never store money as float; see `Money` value object. |

---

## 12. Cross-cutting conventions

- **DB is `snake_case`, TypeScript is `camelCase`.** Mappers in `data/mappers` are
  the *only* place the two meet. No snake_case leaks above the data layer.
- **No `any`.** Unknowns are `unknown` and narrowed. DB rows are typed `Row<T>`.
- **`Result<T, E>`** (a small Either) for fallible operations instead of throwing
  across layers; throwing is reserved for programmer errors.
- **Money never floats.** Stored and computed as integer minor units (cents).
- **Time is UTC at rest, local at render.** Storage is epoch millis; formatting to
  the tutor's timezone happens only in the presentation layer.

---

## 13. Deliverables in this design phase

| Deliverable | File |
|-------------|------|
| Architecture (this doc) | `architecture.md` |
| Database schema design | `docs/schema.md` |
| TypeScript type definitions | `src/domain/types/*.ts` |
| Navigation map | `docs/navigation.md` |

Implementation of features is intentionally **out of scope** for this phase. The
next phase consumes these four artifacts as its contract.
