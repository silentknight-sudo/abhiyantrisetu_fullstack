# Abhiyantri Setu

One TypeScript monorepo for all five surfaces: customer app, partner app, website, vendor portal and admin portal. They share a single NestJS backend on Postgres + PostGIS. The architecture reference is the _Abhiyantri Setu — System Architecture & Tech Stack_ document. This repo builds it phase by phase.

## Status: Phase 0 (Foundation)

| Area                                                                                                                                      | State                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Turborepo + pnpm workspaces, shared TS config                                                                                             | ✅                                             |
| `packages/ui-tokens`: Navy `#1A3A52` + Orange `#FF9F43`, spacing, type scale, Tailwind preset, CSS variables (light/dark)                 | ✅                                             |
| `packages/domain`: job + requirement state machines, GST, money (paise), phone normalisation/masking, roles, en/hi/Hinglish labels        | ✅                                             |
| `packages/schemas`: Zod schemas shared by forms and API (OTP, unified requirements with per-type details, job actions)                    | ✅                                             |
| `apps/api`: NestJS 11, Drizzle ORM, versioned SQL migrations, PostGIS                                                                     | ✅                                             |
| Real phone OTP (MSG91 adapter), hashed codes, rate limits, JWT + rotating refresh tokens, partner device binding, in-app account deletion | ✅                                             |
| Unified `requirements` table (service / renovation / material_rfq / equipment / consult)                                                  | ✅                                             |
| Jobs module: the hire event and guarded state machine, with an event row per transition, start codes and 48h auto-confirm worker          | ✅                                             |
| CI: format, build, typecheck, tests against PostGIS, schema-drift check                                                                   | ✅                                             |
| Data migration from the Lovable/Supabase project                                                                                          | ⏳ needs access to the current Supabase schema |
| `apps/mobile`, `apps/web`, `apps/vendor`, `apps/admin`, `packages/ui-web`, `packages/ui-native`, `packages/api-client`                    | ⏳ Phase 1                                     |

## Layout

```
apps/
  api/            NestJS modular monolith (+ BullMQ worker entrypoint: src/worker.ts)
    drizzle/      versioned SQL migrations (generated from src/db/schema.ts)
packages/
  ui-tokens/      design tokens
  domain/         business rules shared by every surface
  schemas/        Zod schemas shared by forms and API
```

`apps/workers` from the architecture doc lives as `apps/api/src/worker.ts`. It is a separate process and deployable, but it reuses the API's modules directly.

## Getting started

Requires Node 22, pnpm 10 and Docker (or a local Postgres 16 with PostGIS, plus Redis).

```bash
pnpm install
docker compose up -d                 # Postgres+PostGIS (setu_dev, setu_test) and Redis
cp apps/api/.env.example apps/api/.env
export $(grep -v '^#' apps/api/.env | xargs)
pnpm build                           # builds shared packages
pnpm db:migrate && pnpm db:seed      # schema + catalog categories
pnpm --filter @setu/api dev          # http://localhost:4000, Swagger at /docs
```

With `SMS_PROVIDER=console`, OTP codes are printed in the API log. Production refuses to boot with console SMS.

```bash
curl -XPOST localhost:4000/v1/auth/otp/send   -H 'content-type: application/json' -d '{"phone":"9876543210"}'
curl -XPOST localhost:4000/v1/auth/otp/verify -H 'content-type: application/json' -d '{"phone":"9876543210","code":"<from log>"}'
```

### Common tasks

| Command                           | What it does                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                       | All unit and integration tests. API tests need `TEST_DATABASE_URL` (defaults to `postgres://setu:setu@localhost:5432/setu_test`) |
| `pnpm typecheck`                  | Type-checks every package, including tests                                                                                       |
| `pnpm db:generate`                | Creates a migration after editing `apps/api/src/db/schema.ts` (CI fails if you forget)                                           |
| `pnpm --filter @setu/api openapi` | Writes `apps/api/openapi.json` (input for the generated API client)                                                              |
| `pnpm format`                     | Prettier                                                                                                                         |

## API (v1)

```
POST /v1/auth/otp/send          POST /v1/auth/otp/verify
POST /v1/auth/refresh           POST /v1/auth/logout
GET|PATCH|DELETE /v1/me
GET  /v1/catalog/categories
POST /v1/requirements           GET /v1/requirements[/:id]     POST /v1/requirements/:id/cancel
GET  /v1/jobs[/:id]             GET /v1/jobs/:id/events
POST /v1/jobs/:id/{schedule|reschedule|start|complete|confirm|cancel|dispute|resolve|start-code}
GET  /v1/health
```

## Rules this codebase holds to

- **Only the Jobs module changes job state.** It locks the row, runs the guarded transition table from `@setu/domain`, and writes a `job_events` row in the same transaction. Requirements follow the same pattern with `requirement_events`.
- **Money is integer paise** (`bigint` in Postgres). GST is computed in `@setu/domain` so the quote screen, invoice and API agree.
- **No secrets at rest in plaintext**: OTPs, start codes and refresh tokens are stored only as hashes. Aadhaar is masked only.
- **Every vendor sits behind an adapter** (e.g. `SmsProvider`). Swapping a vendor touches one file.
- **Clients never talk to the database.** Everything goes through `/v1`.
- **Data stays in India**: deploy to AWS `ap-south-1` / Supabase Mumbai.

## Next (Phase 1: core loop)

1. `packages/api-client`: generate TanStack Query hooks from `openapi.json`.
2. Catalog, Matching (PostGIS radius plus rule-based ranking), Leads & credits, Quotes & negotiation (`POST /quotes/:id/accept` calls `JobsService.hire`).
3. Payments (Razorpay orders and webhook, append-only ledger), WhatsApp lead notifications via BSP.
4. `apps/mobile` (Expo, customer + partner variants), `apps/web` (Next.js), `apps/admin` v1.
5. Move throttling to a Redis store before running more than one API task.
