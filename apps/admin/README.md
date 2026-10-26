# Setu Admin

Staff portal for Abhiyantri Setu (Next.js, client-rendered). Staff sign in with their phone OTP; the session lives in `sessionStorage`, so closing the tab signs out. Each page is shown only to the roles the API lets use it, and the API enforces the same roles.

| Page     | Roles                 | What it does                                                              |
| -------- | --------------------- | ------------------------------------------------------------------------- |
| Overview | all staff             | Partners to verify, open disputes, money held and owed, jobs, waitlist    |
| Partners | verification, ops     | Verify, reject (with reason) or suspend partners; call them; audit-logged |
| Disputes | ops, support          | Both parties' phones, the customer's reason; release to partner or refund |
| Jobs     | ops, support, finance | Every job by state, with customer and partner                             |
| Payouts  | ops (view), finance   | What each partner is owed; record a bank/UPI payout with its reference    |
| Refunds  | ops (view), finance   | Automatic refunds to customers and their status; retry failed ones        |
| Ledger   | ops, finance          | Account balances and the trial balance                                    |
| Waitlist | ops, support          | Sign-ups by role and sector, CSV export                                   |

`super_admin` sees everything.

## Run it

```bash
cp .env.example .env.local        # NEXT_PUBLIC_API_URL
pnpm --filter @setu/admin dev     # http://localhost:3002 (allowed by the API's default CORS_ORIGINS)
```

Make someone staff (until the admin has user management):

```sql
UPDATE users SET roles = '{super_admin}' WHERE phone = '+919800000001';
```

They sign in again to pick up the role.

## Deploy (Vercel)

Import the repo as a second Vercel project with **Root Directory** `apps/admin` (`vercel.json` builds the shared packages first), set `NEXT_PUBLIC_API_URL`, and add the admin's domain (e.g. `admin.abhiyantrisetu.com`) to the API's `CORS_ORIGINS`. Responses carry `noindex` and `X-Frame-Options: DENY`.

Not yet: RazorpayX payouts, partner documents/KYC review, user and role management.
