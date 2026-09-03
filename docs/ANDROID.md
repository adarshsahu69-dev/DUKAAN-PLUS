# DUKAAN PLUS — Android APK (Bubblewrap TWA)

The web app is wrapped as an **Android Trusted Web Activity (TWA)** using
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). Push a
`v*.*.*` tag and the GitHub Actions workflow builds a signed release APK
and attaches it to a GitHub Release, ready to install on any Android
device.

## How the pieces fit together

- **`twa-manifest.json`** — the single source of truth for the TWA
  config (package id, host, start URL, icons, colours, version).
  Bubblewrap generates the full Android project from this.
- **`.github/workflows/android.yml`** — CI: on a `v*` tag, set up JDK
  17 + Node, decode the release keystore, run `bubblewrap build`,
  generate `assetlinks.json`, and upload the signed APK + DAL file to
  a GitHub Release.
- **`scripts/generate-assetlinks.mjs`** — runs `keytool` against the
  keystore to extract the signing certificate's SHA-256, then writes
  a valid `assetlinks.json` next to the APK.
- **`scripts/generate-png-icons.mjs`** — converts the SVG icons in
  `web/public/` to the PNG sizes Bubblewrap / PWABuilder expect
  (192, 512, maskable 192/512/1024, favicon, apple-touch).

## One-time setup (you, locally)

You need a release keystore. Generate it once and store it as GitHub
secrets — **never lose it**, or you can never update the app.

```bash
keytool -genkey -v \
  -keystore dukaan-release.keystore \
  -alias dukaan \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass '<YOUR_STORE_PASSWORD>' \
  -keypass   '<YOUR_KEY_PASSWORD>' \
  -dname "CN=DUKAAN PLUS, OU=Apps, O=Adarsh, L=IN, S=IN, C=IN"
```

Then add four **repository secrets** in GitHub
(Settings → Secrets and variables → Actions → New repository secret):

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w0 dukaan-release.keystore` (single line) |
| `KEYSTORE_PASSWORD` | the `-storepass` you used |
| `KEY_ALIAS` | `dukaan` |
| `KEY_PASSWORD` | the `-keypass` you used |

## Trigger a build

**On a tag push** (recommended):

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow runs, the APK appears under **GitHub → Releases → v1.0.0**.
Download `app-release-signed.apk`, transfer it to the Android device,
enable "Install from unknown sources", and install.

**Manually** (without a tag): use the **Run workflow** button on the
Actions tab and pass a `versionName` / `versionCode`.

## Install the APK on a device

1. Download `app-release-signed.apk` from the GitHub Release onto the
   phone (e.g. open the release on the phone, tap the asset).
2. If Android blocks the install: Settings → Apps → Special access →
   "Install unknown apps" → allow your browser/file manager.
3. Open the APK. The app installs as **"Dukaan"** with the DUKAAN PLUS
   icon. Launch it — it opens full-screen, no browser chrome.

## Local build (optional, for testing before tagging)

Requires JDK 17 and Node 20 on your machine.

```bash
# One-time: install Bubblewrap
npm i -g @bubblewrap/cli

# Generate the Android project + APK
bubblewrap build \
  --manifest=twa-manifest.json \
  --keystore=dukaan-release.keystore \
  --keystorePass='<storePass>' \
  --keyAlias=dukaan \
  --keyPass='<keyPass>' \
  --version=1.0.0 \
  --versionCode=1

# Output: android-twa/app/build/outputs/apk/release/app-release-signed.apk
adb install -r android-twa/app/build/outputs/apk/release/app-release-signed.apk
```

## Known limitation: Digital Asset Links verification

For Chrome to treat the TWA as a **fully verified, full-screen native
app** (no URL bar, no "Open in Chrome" bar), it needs a
`/.well-known/assetlinks.json` at the **host root** of the web origin.

The DUKAAN PLUS PWA is hosted on a **GitHub Pages project site**
(`adarshsahu69-dev.github.io/DUKAAN-PLUS/`). GitHub only lets you
serve files under your project path — you cannot put a file at the
host root (`/.well-known/`) from this repo. So the live TWA will:

- ✅ Install and launch the PWA correctly.
- ⚠️ Show the URL bar and an "Open in Chrome" bar (Chrome can't fully
  verify the origin).
- ✅ Still work as a usable app on shop counter devices.

To get a **fully verified** TWA, move the PWA to one of:

- A **GitHub user/org site** (`<user>.github.io`) — needs a separate
  repo named `<user>.github.io` and the PWA moved to its root.
- A **custom domain** (CNAME) — point a domain you own at the GitHub
  Pages site and serve `assetlinks.json` at the host root.
- **Firebase Hosting** (you already have the project!) — `firebase
  init hosting`, deploy, and the `*.web.app` origin supports
  `assetlinks.json` at the host root with a one-line `firebase.json`
  rewrite.

If/when you want the fully-verified experience, the CI workflow
already writes the correct `assetlinks.json` next to the APK in each
GitHub Release — you just need to host that file at the right place.

## Updating the app

1. Bump `versionCode` in `twa-manifest.json` (or let CI derive it from
   the commit count on tag builds).
2. Push a new tag: `git tag v1.0.1 && git push origin v1.0.1`.
3. Distribute the new APK from the new GitHub Release.
