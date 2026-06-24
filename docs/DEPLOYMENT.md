# Deployment guide

EasyTutor ships to three targets from one codebase: the **App Store** (iOS), the
**Play Store** (Android), and the **web**. Mobile builds use [EAS Build](https://docs.expo.dev/build/introduction/);
the web build is a static export you can host anywhere.

> Versioning: bump `expo.version` in `app.json` for user-facing releases. For native
> stores also bump `ios.buildNumber` and `android.versionCode` (add them to `app.json`
> when you cut your first store build).

---

## 1. One-time prerequisites

```bash
npm install -g eas-cli
eas login
```

- **Apple**: a paid Apple Developer account; an App Store Connect app record.
- **Google**: a Google Play Console account; a service-account JSON key for automated submission.
- Run `eas build:configure` once to generate `eas.json` and register the project (it is
  not committed yet — this creates it).

A typical `eas.json` to start from:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  },
  "submit": { "production": {} }
}
```

---

## 2. Mobile builds (EAS)

### Internal preview (testers, no store)

```bash
eas build --profile preview --platform ios       # installable on registered devices / TestFlight
eas build --profile preview --platform android    # APK for direct install
```

### Production

```bash
eas build --profile production --platform all
```

EAS produces a signed `.ipa` and `.aab`. Credentials (certificates, keystore) are managed
by EAS by default; let it generate and store them on first run.

### Submit to the stores

```bash
eas submit --platform ios       # uploads the .ipa to App Store Connect / TestFlight
eas submit --platform android   # uploads the .aab to Play (uses the service-account key)
```

Then finish review/rollout in App Store Connect and the Play Console.

### Store listing checklist

- App name **EasyTutor**, icon, and screenshots for each device class.
- **Calendar permission** copy is already declared in `app.json`
  (`NSCalendarsUsageDescription` / `NSCalendarsFullAccessUsageDescription` and the
  Android `expo-calendar` plugin string). Keep the privacy questionnaire consistent:
  EasyTutor stores data **on-device only** and makes **no network calls**, so the data
  collection answers are "no data collected."
- Privacy policy URL (host a short policy reflecting the local-only model).

---

## 3. Web deployment

The web target is configured for a single-file static export (`web.output: "single"` in
`app.json`).

```bash
npx expo export --platform web      # outputs to dist/
```

Host the contents of `dist/` on any static host:

- **Vercel / Netlify**: point the project at the repo, set the build command to
  `npx expo export --platform web` and the output directory to `dist`.
- **GitHub Pages / S3 / Cloudflare Pages**: upload `dist/` as static assets.

Because it's a single-page app, configure the host to **rewrite all routes to
`index.html`** so deep links (e.g. `/students/:id`) resolve. The app's link scheme and
route config live in `src/app/navigation`.

> Note: on web, SQLite runs via WASM and data is stored in the browser. Each browser/
> device has its own local database — there is no shared backend yet (see the roadmap's
> cloud-sync item).

---

## 4. Over-the-air (OTA) updates

For JS-only changes (no native module/permission changes) you can ship via
[EAS Update](https://docs.expo.dev/eas-update/introduction/) without a store review:

```bash
eas update --branch production --message "Fix payment rounding"
```

Anything that changes native modules, permissions, or `app.json` plugins requires a new
store build.

---

## 5. Release flow (suggested)

1. `npm run typecheck` is green; manual smoke test on web + one native platform.
2. Bump `expo.version` (and native build numbers for store builds).
3. Tag the release in git.
4. `eas build --profile production --platform all` → `eas submit`.
5. `npx expo export --platform web` → deploy `dist/`.
6. For hotfixes that are JS-only, prefer `eas update`.
