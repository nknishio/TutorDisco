# Setup guide

This guide gets EasyTutor running locally on iOS, Android, and the web.

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 20 LTS or newer | Use [nvm](https://github.com/nvm-sh/nvm) to match versions |
| npm | 10+ | Ships with Node 20 |
| Git | any recent | |
| Watchman | latest (macOS) | Optional but recommended for file watching |

Platform-specific (only for native builds):

- **iOS** — macOS with **Xcode 16+**, the iOS Simulator, and CocoaPods (`sudo gem install cocoapods` or via Homebrew).
- **Android** — **Android Studio** with an SDK Platform + an emulator (AVD), and `JAVA_HOME` pointing at JDK 17.

You do **not** need a paid Apple/Google developer account to run locally — only to ship
(see [DEPLOYMENT.md](DEPLOYMENT.md)).

## 2. Install

```bash
git clone <repo-url> EasyTutor
cd EasyTutor
npm install
```

## 3. Run

### Dev server (recommended first run)

```bash
npm start
```

Then press:

- `w` — open in the browser (fastest feedback loop, uses SQLite via WASM)
- `i` — open the iOS Simulator
- `a` — open an Android emulator

### Native builds directly

```bash
npm run ios       # compiles and launches on the iOS Simulator
npm run android   # compiles and launches on an Android emulator/device
npm run web       # runs the web build
```

The first native build is slow (it compiles the New-Architecture native modules). Later
runs are incremental.

## 4. Project configuration

- **`app.json`** — Expo config: app name (`EasyTutor`), slug, URL scheme (`easytutor`),
  bundle/package identifiers, calendar usage strings, and plugins
  (`expo-calendar`, `expo-asset`, `expo-sharing`). New Architecture is enabled.
- **`tsconfig.json`** — strict TypeScript with the `@/*` → `src/*` path alias.
- **`metro.config.js`** / **`babel.config.js`** — bundler configuration.

There are currently **no required environment variables** — the app is fully local.

## 5. Database & migrations

On first launch you create a **local account** (sign-up screen). Each account opens its own
tutoring SQLite database (the first account adopts the legacy `tutor.db`); a separate
`easytutor-accounts.db` registry stores accounts and the active-account pointer. Signing in
points the data layer at that account's database. When an account's database is opened
(`src/app/di/container.ts` → `src/data/db`):

1. `PRAGMA journal_mode = WAL` and `foreign_keys = ON` are set per connection.
2. Migrations in `src/data/db/migrations/` run in order (`0001_init` … `0005_*`).
3. Default email templates are seeded (`src/data/seed.ts`).

To add a migration: create `src/data/db/migrations/000N_description.ts`, export it, and
register it in `migrations/index.ts`. Migrations are forward-only and versioned. (Each
per-account database runs the same migration set.)

To reset local data during development (this also clears accounts):

- **Web**: clear the site's IndexedDB/storage in the browser devtools.
- **iOS Simulator**: Device ▸ Erase All Content and Settings, or delete the app.
- **Android emulator**: long-press the app ▸ App info ▸ Storage ▸ Clear storage, or uninstall.

## 6. Calendar permissions when developing

Calendar sync uses `expo-calendar` and requires the OS permission, which is requested the
first time you sync a session. On the Simulator/emulator you can grant it in the system
permission dialog. The ICS export path needs no permission and works everywhere
(including web, where it triggers a file download).

## 7. Verifying your setup

```bash
npm run typecheck   # should exit 0
npm start           # first launch shows the sign-up screen; create an account, then you
                    # reach the Students list with seeded templates available
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Metro cache weirdness after dependency changes | `npx expo start -c` (clears the cache) |
| iOS build fails on pods | `cd ios && pod install && cd ..`, then `npm run ios` |
| "Command PhaseScriptExecution failed" | Ensure Xcode command-line tools are selected: `sudo xcode-select -s /Applications/Xcode.app` |
| Android build can't find a JDK | Set `JAVA_HOME` to a JDK 17 install |
| Stale native modules after upgrading Expo | Delete `ios/`, `android/` and re-run `npx expo prebuild` (regenerates native projects) |
