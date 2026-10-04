This is an Expo/React Native app (Expo SDK ~57, React 19, RN 0.86). No README; `PRODUCT.md` / `DESIGN.md` are the product/design source of truth, `docs/android-release.md` is the release source of truth.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing any code that touches an Expo or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt and follow its links; never answer from memory.

## Commands (npm, not bun — repo uses `package-lock.json`, Node 22 in CI)

```bash
npm ci                                   # install (CI uses this)
npx expo install <package>               # ALWAYS use instead of npm add — resolves SDK-compatible versions
npm run lint                             # biome check . (CI runs: npx @biomejs/biome ci .)
npm run lint:fix                         # biome check --write .
npm run typecheck                        # tsc --noEmit
npm run check                            # lint + typecheck
npx expo export --platform web --output-dir dist   # web export smoke
```

- Run `npm run check` before declaring any task done.
- Local hooks (`lefthook`, `npx lefthook install`): pre-commit runs Biome on staged files + full `tsc --noEmit`; pre-push runs a web-export smoke check to `.expo/dist-smoke`. Bypass only with `LEFTHOOK=0`.
- Commits must pass commitlint Conventional Commits (`commitlint.config.mjs`): `feat|fix|chore|ci|docs|style|refactor|perf|test|build|revert`, header ≤100 chars.

## Structure

- Routes live in `app/` (not `src/`): `_layout.tsx` (Stack: `index`, `person/[id]`), `index.tsx`, `person/`, `+html.tsx`, `+not-found.tsx`. Keep non-route code out of `app/`.
- Non-route code at repo root: `components/` (currently just `lamplight.tsx`), `constants/` (`braving.ts`, `lamplight.ts`), `lib/` (storage + domain logic), `assets/`, `.maestro/`.
- Path alias: `@/*` maps to `./*` (`tsconfig.json`, extends `expo/tsconfig.base`, strict).
- `app.json`: `typedRoutes: true`, `experiments.baseUrl: "/marble-jar"` — the web build is served from the `/marble-jar` subpath (GitHub Pages). `web.output: "static"`, bundler Metro. Never use `appId:` assumptions from other projects.
- Storage is platform-split: `lib/store.ts` holds types + shared logic (`JAR_CAPACITY = 20`, sorting, week buckets); `lib/impl.native.ts` is expo-sqlite, `lib/impl.web.ts` is localStorage, `lib/impl.ts` is a web fallback for typecheckers. Metro resolves the right impl per platform — keep sort/order logic shared so web and native order identically, and never pull `wa-sqlite` into the web bundle (no COOP/COEP on Pages).

## Testing (Maestro web E2E only — no unit tests)

- Flows in `.maestro/*.yml` run against the web export served under `marble-jar/` at `http://localhost:8081/marble-jar`, or against the dev server (`npm run web`, same base path): `npm run e2e:web` (`maestro test .maestro/*.yml`).
- Every `testID` used by a flow must be mirrored as `nativeID` — on web Maestro resolves `id:` via the DOM `id` (from `nativeID`), not `data-testid`, because accessibility labels shadow it. See the header comment in `.maestro/add-marble.yml`.
- Flow assertions hard-code `JAR_CAPACITY` (20); bump them when the capacity changes. Web persistence is localStorage, so reload-without-clearState must keep state.

## Building & releasing (no EAS, no OTA, no Play Store)

- Push to `main` or dispatch the workflow; shipping means cutting a new release.
- Android (`android.yml`): `expo prebuild --platform android --clean` (CNG) → decode keystore → inject `release` signingConfig → `./gradlew assembleRelease` (single line, `ANDROID_ARCHITECTURES=arm64-v8a,armeabi-v7a`; add `x86_64` for emulators) → attach to GitHub Release for tag `v<expo.version>`. Needs Java 17; AGP fetches SDK components via `android.builder.sdkDownload=true` — do not reintroduce `android-actions/setup-android` (its obsolete `tools` package breaks the build).
- Four repo secrets hold the keystore: `ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`. The key is stable so users upgrade in place; the one exception is the one-time uninstall migrating off the old debug-signed APK (wipes local data). Back up the keystore file — losing it forces a new application id.
- Versioning is manual (no autoIncrement): bump `expo.version` (→ versionName) AND `expo.android.versionCode` (→ versionCode) before merging a release change. Note: `versionCode` is currently absent from `app.json` (defaults to 1) — add it when cutting the next release. Android refuses installs whose versionCode is not higher.
- Web/PWA (`pages.yml`): `expo export --platform web --output-dir dist` → GitHub Pages. iOS has no native build — iOS users use the Pages build.

## Rules

- `android/` and `ios/` are gitignored CNG output. Never create or edit them — configure native behavior in `app.json` and config plugins (currently `expo-router`, `expo-splash-screen`, `expo-sqlite`).
- Expo Go only includes bundled native modules. After adding a library with native code, use a dev build (`npx expo run:android` locally, which prebuilds `android/`).
- Prefer Expo modules over third-party libraries; check available skills (opencode config wires `expo-*` skills to fixer/designer lanes) before adding dependencies.
- Biome style (enforced): 2-space indent, double quotes, semicolons, trailing commas `all`, 100-col width, organize-imports on. Notable lint: `useImportType: error`, `noNonNullAssertion: warn`, `noExplicitAny: warn` (off in tests), `useExhaustiveDependencies: warn`.
