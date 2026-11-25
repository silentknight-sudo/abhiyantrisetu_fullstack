# Abhiyantri Setu: launch checklist (Google Play)

Everything that must exist before the customer app (`com.abhiyantrisetu.app`) and the
partner app (`com.abhiyantrisetu.partner`) can go live. **Owner** says who has to do it:
*You* = needs your identity, documents, money or a signature; *Dev* = can be done in code
or config once your accounts and keys exist.

The code is ready for all of these; each service switches from its test stand-in to the
real one by setting the environment variables listed.

## 1. Company and legal (You)

| Item | Why | Notes |
|---|---|---|
| Registered business (Pvt Ltd / LLP / proprietorship) with PAN, GSTIN and a current bank account | Razorpay KYC, MSG91 DLT, Meta verification and an organisation Play account all ask for it | Use the same legal name everywhere |
| D-U-N-S number for the business | Google Play **organisation** developer accounts require it | Free from Dun & Bradstreet, takes about 1–2 weeks |
| Privacy policy, Terms of use, Refund & cancellation policy, Partner agreement | Play Store, Razorpay and DPDP Act all require public URLs | Have a lawyer review; host them on the website |
| Grievance officer name and email (DPDP Act) | Shown in the privacy policy and the app | |
| Support email and phone | Play listing, Razorpay, customer support | e.g. support@your-domain |

## 2. Domain, hosting and servers

| Item | Owner | Env vars / notes |
|---|---|---|
| Domain (e.g. abhiyantrisetu.com) and DNS | You | api., admin., www. sub-domains |
| AWS account (Mumbai, ap-south-1) with billing | You | Production plan is in `docs/deploy-api.md` |
| Postgres 16 with PostGIS (RDS) | Dev | `DATABASE_URL` |
| Redis (ElastiCache) | Dev | `REDIS_URL`, `THROTTLE_STORE=redis` |
| S3 bucket for photos and documents | Dev | `STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| API container (ECS / App Runner) with HTTPS | Dev | `PUBLIC_API_URL`, `CORS_ORIGINS`, `TRUST_PROXY_HOPS` |
| Strong random secrets | Dev | `JWT_ACCESS_SECRET`, `OTP_HASH_SECRET` (32+ chars each) |
| Admin panel hosting | Dev | `API_PROXY_URL` |
| Website on Vercel | Dev | already configured |
| Daily database backups and uptime/error alerts | Dev | RDS snapshots; alerting service of your choice |

## 3. SMS login codes: MSG91 (You, then Dev)

1. MSG91 account in the business name.
2. **DLT registration** (TRAI) as a principal entity, then a sender ID (header) and an OTP
   content template. Takes about 1–2 weeks.
3. Give Dev: `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID`. Set `SMS_PROVIDER=msg91`.

## 4. Payments: Razorpay (You, then Dev)

1. Razorpay account, business KYC (PAN, GSTIN, bank, website with policies).
2. Activate live mode; create the webhook to `https://api.<domain>/v1/webhooks/razorpay`.
3. Give Dev: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
   Set `PAYMENTS_PROVIDER=razorpay`, `PLATFORM_FEE_BPS` (your fee, e.g. 1000 = 10%).
4. Optional later: RazorpayX for automatic partner payouts (today finance records payouts).

## 5. WhatsApp alerts: Meta WhatsApp Cloud API (You, then Dev)

1. Meta Business account, **business verification**.
2. A phone number not used on normal WhatsApp; display name approval.
3. Submit the templates in `docs/whatsapp-templates.md` for approval.
4. Webhook to `https://api.<domain>/v1/webhooks/whatsapp`.
5. Give Dev: `WHATSAPP_TOKEN` (permanent system-user token), `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`. Set `WHATSAPP_PROVIDER=meta`.

## 6. Push notifications (Dev, needs your Google account)

1. Expo account and EAS project: `EAS_PROJECT_ID`; `EXPO_ACCESS_TOKEN` for the API.
2. Firebase project with both Android apps added; FCM V1 service-account key uploaded to EAS.
3. Set `PUSH_PROVIDER=expo`, `NOTIFICATIONS_DELIVERY=queue`.

## 7. Setu AI (You, then Dev)

Anthropic API account with billing; `ANTHROPIC_API_KEY`. Without it the assistant stays off.

## 8. Google Play Console (You, then Dev)

1. **Developer account**: organisation account (needs the D-U-N-S number), one-time US$25 fee,
   identity verification. *A new personal account must run a closed test with at least 12
   testers for 14 days before it can publish to production.*
2. **Two app entries**: "Abhiyantri Setu" (customer) and "Setu Partner" (partner).
3. **Signing**: Play App Signing on; Dev builds signed AABs with EAS (`eas build -p android`).
4. **Store listing for each app**: name (30 chars), short description (80), full description
   (4,000), 512×512 icon, 1024×500 feature graphic, at least 2 phone screenshots,
   category (House & Home), contact email, privacy policy URL.
5. **App content forms**: Data safety (phone number, name, location, photos, payment info
   via Razorpay), content rating questionnaire, target audience (18+), ads declaration
   (no ads), government app (no), financial features (payments handled by Razorpay).
6. **App access for reviewers**: login is OTP-only, so set `REVIEW_LOGIN=+91XXXXXXXXXX:NNNNNN`
   on the API and give that number and code to Google under "App access". That number gets
   the fixed code without an SMS; every other number is unaffected.
7. **Permissions**: location (foreground only, to find nearby professionals), camera and
   photos (job photos and documents), notifications.
8. **Testing track**: internal test → closed test → production; pre-launch report must be clean.

## 9. Operations before opening

| Item | Owner |
|---|---|
| Real prices in the service catalogue (Admin → Catalogue) | You |
| Live and waitlist sectors (Admin → Pilot sectors) | You |
| Onboard and verify 30–50 partners with documents | You |
| Staff accounts with roles (ops, verification, support, finance) | Dev |
| Remove sample data and test accounts | Dev |
| Load test and security check | Dev |

## 10. What only you can provide

Your business documents and KYC, payment for the accounts (Play US$25, AWS, MSG91 credits,
Razorpay is free to sign up, WhatsApp per-conversation fees, Anthropic usage), DLT and
Meta verification, the D-U-N-S number, and the legal texts. Once each account exists, the
keys are added to the server's environment and the matching service switches on.
