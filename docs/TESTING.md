# Testing plan

The codebase has **no automated tests yet**, but the architecture was built to be highly
testable: domain logic is pure, the database is behind an interface, and stores depend on
repository contracts via DI. This plan defines the strategy, the recommended toolchain,
and a prioritized backlog of what to cover.

---

## 1. Strategy — the testing pyramid

```
        ╱╲        E2E (few)         — Maestro flows on a built app
       ╱──╲       Integration       — repositories vs. real/in-memory SQLite
      ╱────╲      Component          — screens & UI kit with RNTL
     ╱──────╲     Unit (many)        — domain services, mappers, utils, hooks
```

Most value, lowest cost: **unit tests on the domain layer**. The pure services
(`earnings`, `payments`, `templates`, `calendar`) and the utils (`money`, `datetime`,
`time`, `result`, `id`) have no I/O and can be tested exhaustively.

---

## 2. Recommended toolchain

| Layer | Tools |
| --- | --- |
| Unit / component | [Jest](https://jestjs.io) via `jest-expo` + [@testing-library/react-native](https://callstack.github.io/react-native-testing-library/) |
| Integration | Jest + an **in-memory `DatabaseClient`** (see §4) or `expo-sqlite`'s in-memory DB |
| E2E | [Maestro](https://maestro.mobile.dev) (simple YAML flows, works on iOS/Android) |
| Static | `tsc --noEmit` (already wired as `npm run typecheck`); add ESLint |

Suggested `package.json` scripts to add:

```jsonc
"test": "jest",
"test:watch": "jest --watch",
"test:ci": "jest --coverage --ci",
"lint": "eslint . --ext .ts,.tsx"
```

`jest-expo` provides the preset that understands the Expo/React Native module graph.

---

## 3. What to test, by layer

### Unit — domain services & utils (write these first)

- **`domain/services/earnings`** — `sessionPaymentCents` for rate × duration across
  rounding edge cases (e.g. 45-min sessions, odd cents); totals/aggregations.
- **`domain/services/payments`** — `paymentForSession` produces the right amount/status/links.
- **`domain/services/templates`** — `renderTemplate` substitutes every variable token,
  leaves unknown tokens intact, and handles empty bodies; `SAMPLE_VALUES` cover all
  `TEMPLATE_VARIABLES`.
- **`domain/services/calendar`** — `buildEventTitle` (SAT Mode on/off) and
  `buildIcsContent` (valid VEVENT, correct date/time formatting, escaping).
- **`shared/utils/money`** — `parseDollarsToCents` (valid, invalid, negative, empty,
  too many decimals) and `formatCents`.
- **`shared/utils/time` / `datetime`** — `isIsoDate`, `isIsoTime`, formatters, `todayIsoDate`.
- **`shared/utils/result`** — `ok`/`err`/`isOk`/`isErr`/`unwrap`.

### Unit — hooks

- **`shared/hooks/useFormSubmit`** — clears error and sets `submitting` on start; calls
  `onSuccess` with the value on `ok`; surfaces `error.message` on failure; always clears
  `submitting` in `finally` (including when the action throws).

### Integration — data layer

- **Mappers** (`data/mappers`) — round-trip every entity: `toRow(fromRow(x)) ≈ x`,
  including null handling and branded types.
- **`BaseSqliteRepository`** — create/getById/list/update/softDelete/hardDelete/count
  against an in-memory DB; validation rejects bad input before write;
  `list` excludes soft-deleted rows unless `includeDeleted`; pagination via limit/offset.
- **Entity repositories** — the custom finders: `students.search`, `sessions.listByStudent`
  / `listByDateRange`, `payments.listByStudent`, `calendarLinks.getActiveForSession`,
  `settings.get` (creates defaults on first access).
- **Migrations** — running the full migration set on an empty DB yields the expected
  schema; running twice is idempotent.

### Component — UI kit & screens

- **UI kit** (`shared/ui`) — Button (disabled/loading states, `accessibilityState`),
  Select (open/select/close, selected marker), Modal (backdrop + close dismiss),
  TextField/FormField (error vs helper text, required marker), Table rendering.
- **Form modals** — validation messages appear; submit disables the button; a repository
  error is surfaced inline (assert against a fake store/repository).
- **Screens** — empty/loading/ready/error states render correctly; the key flows below.

### E2E — critical user journeys (Maestro)

1. Add a student → it appears in the list and detail.
2. Schedule a session → mark it completed → bill it → mark the payment paid.
3. Generate an email from a template and confirm the clipboard copy toast.
4. Export a session to `.ics` (share sheet appears on native / file downloads on web).
5. Toggle SAT Mode and confirm the session/event title changes.

---

## 4. Test infrastructure to build

- **In-memory `DatabaseClient`** — implement the `DatabaseClient` interface
  (`data/db/client.ts`, incl. `close()`) backed by `expo-sqlite`'s in-memory database (or a
  JS fake) so repository tests run fast and isolated. This is the single most valuable piece
  of test infra; it unlocks the entire integration layer without a device.
- **Store test harness** — initialize the DI container with the in-memory client
  (`setContainer`/`reinitContainer`), then exercise stores directly (`getRepositories()` is
  the only seam to override). Cover `resetAllStores()` clearing state between accounts.

### Auth layer (new)
- **`src/auth/crypto.ts`** — `hashPassword`/`verifyPassword`: same password+salt reproduces
  the hash; wrong password fails; distinct salts per call.
- **`src/auth/accountsDb.ts`** — create/authenticate/list accounts; duplicate username
  rejected; first account adopts `tutor.db` while later accounts get a unique `db_name`;
  active-account pointer get/set.
- **`authStore`** — register/login activate the account and point the data layer at its DB;
  logout clears the active account and resets stores.
- **Builders/fixtures** — small factory helpers (`makeStudent()`, `makeSession()`) to
  keep tests readable.

---

## 5. Coverage targets & CI

- **Domain + utils + mappers: 90%+** (cheap, high-value — enforce a threshold).
- **Repositories/stores: 70%+** of branches.
- **UI: smoke + key-flow coverage**, not a percentage chase.
- Wire `npm run test:ci` and `npm run typecheck` into CI on every PR; block merge on
  failure. Add E2E as a nightly/pre-release job (it needs a built app).

---

## 6. Prioritized backlog

1. Stand up Jest (`jest-expo`) + RNTL; add the scripts above.
2. Unit-test `money`, `earnings`, `payments`, `templates`, `calendar`, `useFormSubmit`.
3. Build the in-memory `DatabaseClient`; test `BaseSqliteRepository` + mappers.
4. Test entity-specific finders and `settings.get` defaulting.
5. Component-test the UI kit and the five form modals.
6. Add Maestro flows for the five journeys in §3.
7. Turn on coverage thresholds and gate CI.
