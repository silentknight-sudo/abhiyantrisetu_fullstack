# Test environment on Render

`render.yaml` at the repository root describes a complete **test** copy of Abhiyantri
Setu: Postgres (with PostGIS), Redis, the API, the website and the admin portal, all in
Render's Singapore region.

It is a test environment on purpose:

- **Login codes** are written to the API's logs instead of being sent by SMS.
- **Payments** use the built-in fake gateway; no money moves.
- **WhatsApp and push** messages are logged, not sent.
- **Photos** are stored on the API service's own disk and disappear on redeploys.

Do not put real customers on it. Production runs on AWS Mumbai (`docs/deploy-api.md`).

## Set it up (once)

1. Sign in at render.com and connect your GitHub account.
2. **New → Blueprint**, pick `silentknight-sudo/abhiyantrisetu_fullstack` and the branch
   to deploy (for example `claude/keen-heisenberg-idi1ah` or `main`).
3. Render reads `render.yaml` and lists five resources. Press **Apply**.
4. Optional: in **setu-api → Environment**, set `ANTHROPIC_API_KEY` so Setu AI answers
   with Claude. Without it, Setu AI answers from the built-in rate card.

The first deploy takes 10–15 minutes. The API runs its database migrations and the
catalog seed every time it starts.

## Addresses

| Service      | Address                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| API          | https://setu-api.onrender.com (health: `/v1/health`, API docs: `/docs`) |
| Website      | https://setu-web.onrender.com                                           |
| Admin portal | https://setu-admin.onrender.com                                         |

If Render gave a service a different address (it adds a suffix when a name is taken),
update `CORS_ORIGINS` on setu-api and `NEXT_PUBLIC_API_URL` on setu-web and setu-admin
to the real addresses, then redeploy.

## Logging in on the test apps

1. Enter any 10-digit mobile number in the app.
2. Open **setu-api → Logs** in Render and look for `OTP for +91…: 123456`.
3. Enter that code.

To use the admin portal, give a test account a staff role in the database (Render →
setu-db → Connect → PSQL):

```sql
update users set roles = array['customer','ops','finance'] where phone = '+919876543210';
```

## Free plan limits

- Free web services sleep after 15 minutes without traffic; the first request then takes
  about a minute.
- The free Postgres database expires 30 days after creation unless you upgrade it.
- If a website build runs out of memory, move that service to the Starter plan.
