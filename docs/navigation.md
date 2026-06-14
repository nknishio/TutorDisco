# Navigation Map

Navigation uses **React Navigation** with a fully **typed** route tree and
first-class **deep linking** (so every screen has a real URL on web). The
navigation shell is **responsive by width, not by platform**.

---

## Why React Navigation

- Mature, typed (`@react-navigation/native` + typed param lists), works across iOS,
  web, and (future) Android with one API.
- Linking config maps routes ↔ URLs, giving the desktop browser proper
  back/forward, shareable links, and refresh-safe deep links — required by the
  "desktop browser support" goal.
- Plays cleanly with React Native Web.

---

## Responsive shell: tabs vs. sidebar

The **same navigators** render with a different chrome depending on breakpoint
(see `architecture.md` §8). Width is the signal — a narrowed desktop browser behaves
like a phone.

| Breakpoint | Chrome | Primary nav | Detail behavior |
|------------|--------|-------------|-----------------|
| `compact` (phone) | Bottom tab bar | Tabs at bottom | List → push to detail screen |
| `medium` (tablet) | Bottom tabs or rail | Tabs / rail | Optional two-pane |
| `expanded` (desktop) | Left sidebar (rail) | Persistent sidebar | **Master-detail** side-by-side |

The tab/sidebar items are identical; only the container component differs. This is
implemented in `app/navigation` via a `ResponsiveNavigationShell` that selects
bottom-tabs vs. sidebar from `useResponsive()`.

---

## Route tree

```
RootNavigator (stack)
│
├── Onboarding            (shown once; sets up first student / SAT Mode)
│
└── Main  (ResponsiveNavigationShell → Tab/Sidebar)
    │
    ├── DashboardTab (stack)
    │   └── Dashboard                      // today's sessions, balances, alerts
    │
    ├── StudentsTab (stack)
    │   ├── StudentList
    │   ├── StudentDetail   { studentId }  // master-detail target on desktop
    │   ├── StudentEdit     { studentId? } // create when id omitted
    │   └── GuardianEdit    { studentId, guardianId? }
    │
    ├── ScheduleTab (stack)
    │   ├── Calendar                       // day/week/month
    │   ├── SessionDetail   { sessionId }
    │   └── SessionEdit     { sessionId?, studentId?, startsAt? }
    │
    ├── BillingTab (stack)
    │   ├── BillingOverview                // outstanding balances, recent payments
    │   ├── PackageEdit     { studentId, packageId? }
    │   ├── PaymentEdit     { studentId, paymentId? }
    │   ├── InvoiceList
    │   ├── InvoiceDetail   { invoiceId }
    │   └── InvoiceEdit     { invoiceId?, studentId? }
    │
    ├── SatTab (stack)   ◀── MOUNTED ONLY WHEN settings.satMode === true
    │   ├── SatDashboard                   // cohort score progress overview
    │   ├── SatStudentProgress { studentId } // chart vs. target, trajectory
    │   ├── SatAttemptDetail  { attemptId }
    │   ├── SatAttemptEdit    { studentId, attemptId? } // score entry + breakdown
    │   └── SatTargetEdit     { studentId, targetId? }
    │
    └── SettingsTab (stack)
        ├── Settings                       // ◀── SAT Mode toggle lives here
        ├── ThemeSettings
        └── DataSettings                   // export/import; (future) sync account
```

---

## SAT Mode and conditional mounting

The `SatTab` and SAT entry points elsewhere are **conditionally registered**, not
merely hidden:

```ts
// pseudo-structure inside the tab/sidebar navigator
const satMode = useSettingsStore((s) => s.satMode);

return (
  <Tabs>
    <Tabs.Screen name="DashboardTab" ... />
    <Tabs.Screen name="StudentsTab" ... />
    <Tabs.Screen name="ScheduleTab" ... />
    <Tabs.Screen name="BillingTab" ... />
    {satMode && <Tabs.Screen name="SatTab" ... />}{/* registered only in SAT Mode */}
    <Tabs.Screen name="SettingsTab" ... />
  </Tabs>
);
```

**Why conditional registration over render-time hiding:**
- The route truly does not exist when SAT Mode is off, so deep-linking to a SAT URL
  while off can be handled deliberately (redirect to Settings with a prompt) rather
  than rendering a half-mounted screen.
- No dead tab/sidebar entry, no accidental navigation into SAT screens.
- Flipping the toggle re-renders the navigator and the tab appears/disappears
  instantly — and because SAT data is never deleted (architecture.md §10), the
  student's score history is intact when it returns.

SAT entry points **inside** general screens (e.g. an "SAT Progress" button on
`StudentDetail`) are gated the same way: `if (!satMode) return null` at the
component boundary.

---

## Typed route params

Route names and their params are declared once and shared by every navigator,
`useNavigation`, and the linking config — so a typo or a missing param is a compile
error, not a runtime crash.

```ts
// app/navigation/routes.ts (shape only — defined in implementation phase)
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

export type StudentsStackParamList = {
  StudentList: undefined;
  StudentDetail: { studentId: StudentId };
  StudentEdit: { studentId?: StudentId };
  GuardianEdit: { studentId: StudentId; guardianId?: GuardianId };
};

export type SatStackParamList = {
  SatDashboard: undefined;
  SatStudentProgress: { studentId: StudentId };
  SatAttemptDetail: { attemptId: SatAttemptId };
  SatAttemptEdit: { studentId: StudentId; attemptId?: SatAttemptId };
  SatTargetEdit: { studentId: StudentId; targetId?: SatTargetId };
};
// ...one param list per stack; combined into a typed root for useNavigation().
```

> Params carry **branded IDs** (`StudentId`, not `string`) so navigation can't be
> handed the wrong kind of id.

---

## Deep linking / URL map (web)

```
/                                  → Dashboard
/students                          → StudentList
/students/:studentId               → StudentDetail
/students/:studentId/edit          → StudentEdit
/students/new                      → StudentEdit (create)
/schedule                          → Calendar
/schedule/session/:sessionId       → SessionDetail
/billing                           → BillingOverview
/billing/invoices/:invoiceId       → InvoiceDetail
/sat                               → SatDashboard           (only when SAT Mode on)
/sat/students/:studentId           → SatStudentProgress     (only when SAT Mode on)
/settings                          → Settings
```

- Clean, resource-oriented URLs map to the typed routes.
- SAT URLs resolve only when SAT Mode is on; otherwise the linking layer redirects to
  `/settings` so the user can enable it (rather than 404-ing on their own data).
- Refresh-safe and shareable, satisfying desktop-browser expectations.

---

## Navigation ↔ state ↔ data flow

```
User taps StudentList row
        │
        ▼
navigate('StudentDetail', { studentId })
        │
        ▼
StudentDetail screen reads useStudentsStore(s => s.byId[studentId])
        │ (store hydrated on demand from)
        ▼
StudentRepository (interface) → SqliteStudentRepository → SQLite
```

Screens never query SQLite directly; they read Zustand selectors, which are hydrated
through repository interfaces. This keeps navigation a pure presentation concern.
