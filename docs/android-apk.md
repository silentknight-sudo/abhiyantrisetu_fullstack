# Building the Android APKs

The **Build Android APK** workflow (`.github/workflows/android-apk.yml`) builds installable
APKs of both apps on GitHub's machines. No Expo account is needed.

## Build from GitHub

1. Open the repository on GitHub → **Actions** → **Build Android APK** → **Run workflow**.
2. Choose the branch, which app (`both`, `customer` or `partner`) and the API address.
   The default API is the Render test API (`docs/testing-on-render.md`).
3. Wait about 20 minutes. Download the APKs from the run's **Artifacts** section:
   `apk-customer` and `apk-partner`.

Pushing a tag such as `v1.0.0` also builds both apps and attaches the APKs to a GitHub
Release.

## Install on a phone

Copy the APK to an Android phone, open it and allow **Install unknown apps** when Android
asks. The customer and partner apps have different package names, so both can be
installed on the same phone.

## Signing

Without signing secrets, APKs are signed with the Android debug key. That is fine for
testing, but the Play Store needs your own release key, and every later update must be
signed with the same key.

To sign with your release key:

1. Create a key once (keep the file and passwords safe, and never commit them):

   ```sh
   keytool -genkeypair -v -storetype PKCS12 -keystore setu-release.keystore \
     -alias setu -keyalg RSA -keysize 2048 -validity 10000
   ```

2. In GitHub → **Settings → Secrets and variables → Actions**, add:
   - `ANDROID_KEYSTORE_BASE64`: the output of `base64 -w0 setu-release.keystore`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS` (for example `setu`)
   - `ANDROID_KEY_PASSWORD`

The next run signs with that key; the run summary says which key was used.

For Play Store bundles (`.aab`) and iPhone builds, use EAS (`apps/mobile/eas.json`).
