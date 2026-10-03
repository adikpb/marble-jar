This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building & Releasing

**There is no EAS.** Builds are GitHub-native: push to `main` or dispatch the workflow and let GitHub Actions do the work. There is no Play Store submission and no over-the-air update channel — shipping a new build means cutting a new release.

### Android — release-signed APK on a GitHub Release

`.github/workflows/android.yml` runs the same two steps you can run locally:

```bash
npx expo prebuild --platform android     # generate android/ via CNG (gitignored, never commit it)
cd android && ./gradlew assembleRelease  # release-signed APK -> android/app/build/outputs/apk/release/
```

Four repository secrets — `ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` — hold the release keystore. CI decodes it into the generated `android/app/`, injects a `release` signingConfig (passwords read from the environment, never written into `build.gradle`), and attaches `app-release.apk` to the GitHub Release for tag `v<version>`, where `<version>` is `expo.version` in `app.json`.

Because the key is stable, users **upgrade in place** — download the APK and install over the old one. The one exception is the initial migration off the old debug-signed APK, which needs a one-time uninstall (that wipes local app data). Back up the keystore file: losing it means shipping under a new application id.

Versioning is manual — there is no autoIncrement. Bump both `expo.version` and `expo.android.versionCode` before merging a release change; Android refuses to install an APK whose versionCode is not higher than the installed one.

### Web / PWA — GitHub Pages

`.github/workflows/pages.yml` exports the web build and publishes it to GitHub Pages:

```bash
npx expo export --platform web   # static export; CI publishes dist/ to Pages
```

### iOS

There is no native iOS build — iOS users use the web/PWA build from GitHub Pages.

Android signing setup (keytool, the four repository secrets, keystore backup) and install/upgrade instructions: `docs/android-release.md`.

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a native development build: `npx expo run:android` locally (prebuilds `android/`), or push a branch to build the debug APK in CI.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
