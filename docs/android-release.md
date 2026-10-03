# Android release (GitHub Actions, no EAS)

EAS is gone. There is no Expo account, no `EXPO_TOKEN`, no `eas build`, and no
`eas update`. Android is built and published entirely by
`.github/workflows/android.yml`; the APK lands on a GitHub Release. iOS is not
built at all — iOS users use the web/PWA build served from GitHub Pages.

## The APK is release-signed

CI runs `./gradlew assembleRelease` against a keystore you generate once and
keep out of git. Because the key is stable, **users upgrade in place**: download
the new APK and install it over the old one. No uninstall, no lost data.

The price is four repository secrets and one piece of key custody:

- **Four secrets** — `ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`,
  `KEY_ALIAS`, `KEY_PASSWORD`. Setup is one-time and takes about two minutes.
- **Back up the keystore file.** It is decoded onto the runner, used to sign,
  and thrown away — it never appears in an APK, an artifact, or a log. Losing
  it means the only way forward is a new application id, i.e. a new app on the
  device. Treat it like SSH private keys: one copy, offline, mirrored.
- **Rotating the key is a breaking change**, same as any resign. Every existing
  install must be uninstalled first. There is no reason to rotate.
- **Still no Play Store submission.** The pipeline publishes to GitHub
  Releases. Google Play is now *possible* with this key, but that is a separate
  piece of work (Play Console account, AAB instead of APK, release tracks).

`app.debuggable` is unchanged — the shipped release build is not debuggable.

## One-time setup

```bash
# 1. Generate the keystore. Use strong, distinct passwords and record them.
keytool -genkeypair -v \
  -keystore marble-jar-release.keystore \
  -alias marble-jar \
  -keyalg RSA -keysize 2048 -validity 10000

# 2. base64 it for the secret (macOS: -i 0, GNU: -w 0)
base64 -i 0 marble-jar-release.keystore

# 3. Back the .keystore file up somewhere you will still have in five years.
```

Then add four repository secrets (**Settings → Secrets and variables → Actions
→ New repository secret**):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | output of `base64 -i 0 marble-jar-release.keystore` (single line) |
| `KEYSTORE_PASSWORD` | the keystore password you chose in step 1 |
| `KEY_ALIAS` | `marble-jar` |
| `KEY_PASSWORD` | the key password for that alias |

The workflow fails fast if any of the four is missing, naming the ones it
could not find — before Gradle starts, not twenty minutes in.

Secrets are unavailable to workflows triggered by a fork, so fork PRs cannot
build the APK. That is expected.

## Why CNG (no committed `android/`)

`android/` is gitignored and generated on every CI run by
`npx expo prebuild --platform android --clean`. Native configuration lives in
`app.json` (package name, icons, splash screen, plugins). Never create or edit
`android/` by hand — the next build discards it. To change native behaviour,
change `app.json` or add an Expo config plugin.

Consequence: the signing config cannot be committed either. The workflow
injects a `release` signingConfig into the generated
`android/app/build.gradle` on every run, and reads the passwords from the
environment via `System.getenv(...)` so no credential is written to disk.

## Running a build

Push to `main`, or trigger **Android APK** manually via
*Actions → Android APK → Run workflow*. The job:

1. checks out, sets up Java 17 + Android SDK + Node 22, `npm ci`
2. verifies all four signing secrets are present
3. `npx expo prebuild --platform android --clean --no-install`
4. sets `android.builder.sdkDownload=true` so AGP fetches the compileSdk/NDK
   versions the Expo/RN plugins declare
5. base64-decodes the keystore into `android/app/release.keystore` and verifies
   it with `keytool -list`
6. injects the `release` signingConfig into the generated build.gradle
7. `./gradlew assembleRelease` →
   `android/app/build/outputs/apk/release/app-release.apk`
8. verifies the package id with `aapt2 dump badging`
9. uploads the APK as a workflow artifact **and** attaches it to the GitHub
   Release for the tag `v<expo.version>`

Expect roughly 15 minutes for a cold run; later runs are faster thanks to
Gradle/npm caches. Only arm64-v8a and armeabi-v7a are built — add `x86_64` to
`ANDROID_ARCHITECTURES` in the workflow if you install on an emulator.

### Reproducing locally

You need the same keystore. Put `marble-jar-release.keystore` in
`android/app/` after prebuilding, then:

```bash
npx expo prebuild --platform android --clean
mkdir -p android/app
cp marble-jar-release.keystore android/app/release.keystore

# Add a release signingConfig to android/app/build.gradle (android/ is
# gitignored, so this edit is local-only — CI injects the same config itself):
#   signingConfigs {
#     release {
#       storeFile file('release.keystore')
#       storePassword '<KEYSTORE_PASSWORD>'
#       keyAlias 'marble-jar'
#       keyPassword '<KEY_PASSWORD>'
#     }
#   }
# and change buildTypes.release to `signingConfig signingConfigs.release`
# (the Expo template points it at signingConfigs.debug).

cd android && ./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk
```

Same key as CI means the APK installs over the CI-installed build — no
uninstall. Never commit the keystore; `android/` is gitignored, but the
keystore at the repo root is not, so keep it outside the working tree.

## Versioning (manual, no autoIncrement)

`eas.json` used `autoIncrement: true`. That was EAS-specific and is gone, so
version numbers are now whatever `app.json` says. Before merging a change that
should ship as a new APK, bump **both** fields in `app.json`:

```jsonc
"version": "1.1.0",                 // -> versionName
"android": { "versionCode": 2 }     // -> versionCode
```

`versionCode` must be strictly greater than the installed build's, otherwise
Android refuses to install the update at all — even though the signing key now
matches and no uninstall is needed.

The workflow reads `expo.version` to pick the Release tag. Re-running after a
version bump publishes to a new tag; re-running on an unchanged version
uploads with `--clobber` to the existing release.

## How users install

1. Open the GitHub Release for the current tag (Repository → Releases).
2. Download `app-release.apk`.
3. Install it. If an older build is already installed this is a normal upgrade —
   Android may warn that the app came from an unknown source (allow it for your
   browser / Files app when prompted). Choose *Install anyway* / *Update*.

There is no in-app update prompt. To ship changes: merge → CI builds → a new
`app-release.apk` appears on the Releases page → users download and install
over the top.

### Migrating from the old debug-signed APK

The previous pipeline shipped debug-signed APKs, and each CI run used a
different key. Android will refuse to install a differently signed build over an
installed one (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). So the first
release-signed APK requires every existing user to **uninstall the app once**
— which deletes their local data — then install fresh.

That is a one-time cost. Every future update is a normal in-place upgrade.

## What was lost vs EAS

- **No OTA.** EAS Update pushed JS over the air without a store release. There
  is no replacement here: every JS change ships as a new APK.
- **Manual download + install per update.** CI builds the APK and users install
  it themselves; there is no store to push to.
- **Slower loop.** ~15 min CI build plus a manual install, versus seconds for
  an OTA.
- **No dashboard.** EAS build IDs, artifact browsing, and channel management
  are gone; GitHub Actions runs and Releases take their place.
- **No iOS artifact.** Unchanged — there was never an App Store submission, and
  an IPA cannot be signed without an Apple Developer account.
- **Keystore custody is yours now.** Four repo secrets and one file to back up,
  instead of EAS holding the credentials. That is what buys in-place upgrades.