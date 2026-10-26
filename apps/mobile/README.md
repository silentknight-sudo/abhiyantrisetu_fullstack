# Abhiyantri Setu mobile apps

One Expo app, two store apps:

| Variant             | Build with            | Bundle id                    | What it does                                                                     |
| ------------------- | --------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| **Abhiyantri Setu** | default               | `com.abhiyantrisetu.app`     | Post a requirement, compare quotes, hire, pay (held until done), track the job   |
| **Setu Partner**    | `APP_VARIANT=partner` | `com.abhiyantrisetu.partner` | Business profile, leads inbox, quote builder with GST, run jobs with start codes |

Everything goes through `@setu/api-client` (typed from the API's OpenAPI spec); forms validate with the same `@setu/schemas` the API uses, and quote totals come from `@setu/domain`, so the app and the server always agree.

## Run it

```bash
cp .env.example .env              # EXPO_PUBLIC_API_URL: on a phone use your computer's LAN IP
pnpm --filter @setu/mobile start          # customer app (press w for web, or scan with Expo Go)
pnpm --filter @setu/mobile start:partner  # partner app
```

Switching variants needs a cleared Metro cache (`--clear`, already in the scripts): the cache does not know about `APP_VARIANT`.

With the API's `PAYMENTS_PROVIDER=fake`, the Pay button completes the payment without Razorpay (development only). With Razorpay keys it opens Razorpay Checkout: in a WebView on phones, the checkout overlay on web.

## Store builds (EAS)

```bash
npx eas-cli@latest init                    # once; then set EAS_PROJECT_ID for push notifications
npx eas-cli@latest build --profile preview          # customer APK for testers
npx eas-cli@latest build --profile preview-partner  # partner APK
npx eas-cli@latest build --profile production       # store builds (and production-partner)
```

Profiles in `eas.json` set `APP_VARIANT` and `EXPO_PUBLIC_API_URL`.

## Layout

```
src/app/            routes (Expo Router)
  login.tsx           phone OTP (partner logins bind to the device)
  (tabs)/             home, requests (customer) · leads (partner) · jobs, account (both)
  requirement/        post (repair, renovation, consult, materials, equipment) and detail with quotes
  quote/[id].tsx      compare, negotiate, hire
  job/[id].tsx        schedule, start code, complete/confirm, pay, dispute, contact
  lead/[id].tsx       lead detail and quote builder (send, revise, withdraw)
  onboarding.tsx      partner business profile
src/components/     UI kit on @setu/ui-tokens, quote builder, Razorpay checkout
src/lib/            API client and session (SecureStore), push registration, formatting
```

Not in v1 yet: BOQ upload for material orders, in-app chat.
