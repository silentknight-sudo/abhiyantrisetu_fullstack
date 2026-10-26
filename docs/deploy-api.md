# Deploying the API (AWS Mumbai)

The API and the background worker ship as one Docker image (`apps/api/Dockerfile`), and everything runs in **ap-south-1 (Mumbai)**, which keeps personal data in India for the DPDP Act. CI builds the image on every push.

## What you need

| Piece              | Service                     | Notes                                                                                                                                                |
| ------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container registry | Amazon ECR                  | Repository `setu-api`                                                                                                                                |
| API and worker     | ECS on Fargate              | One service for the API (2 tasks in different availability zones), one for the worker (1 task)                                                       |
| Database           | RDS PostgreSQL 16, Multi-AZ | Enable the `postgis` and `pgcrypto` extensions (the first migration does this; the DB user needs `rds_superuser`). Supabase Pro in Mumbai also works |
| Redis              | ElastiCache (Redis 7)       | Used by the worker (BullMQ)                                                                                                                          |
| Secrets            | AWS Secrets Manager         | Injected into the tasks as environment variables                                                                                                     |
| Load balancer      | Application Load Balancer   | HTTPS on `api.abhiyantrisetu.com`; health check `GET /v1/health`                                                                                     |
| DNS and protection | Cloudflare                  | Proxy the API hostname                                                                                                                               |

## Environment variables

| Variable                                                                                     | Pre-launch value                                                       | At launch                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                                   | `production`                                                           | `production`                                                                                                                                                                                 |
| `DATABASE_URL`                                                                               | RDS connection string                                                  | —                                                                                                                                                                                            |
| `REDIS_URL`                                                                                  | ElastiCache endpoint (notification queue and rate limits)              | —                                                                                                                                                                                            |
| `THROTTLE_STORE`                                                                             | `redis` (the production default: rate limits shared by every API task) | —                                                                                                                                                                                            |
| `STORAGE_PROVIDER`                                                                           | `disabled` (no photo uploads yet)                                      | `s3` with `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (see Photo storage)                                                                                           |
| `JWT_ACCESS_SECRET`, `OTP_HASH_SECRET`                                                       | 48+ random characters each (`openssl rand -base64 48`)                 | —                                                                                                                                                                                            |
| `SMS_PROVIDER`                                                                               | `disabled` (login closed; sign-ups still work)                         | `msg91` once DLT templates are approved                                                                                                                                                      |
| `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID`                                                    | empty                                                                  | from MSG91                                                                                                                                                                                   |
| `WHATSAPP_PROVIDER`                                                                          | `disabled`                                                             | `meta` once templates are approved (see `docs/whatsapp-templates.md`)                                                                                                                        |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | empty                                                                  | from WhatsApp Manager or your BSP; webhook URL `https://api.abhiyantrisetu.com/v1/webhooks/whatsapp`                                                                                         |
| `PUSH_PROVIDER`                                                                              | `disabled`                                                             | `expo` when the apps ship (`EXPO_ACCESS_TOKEN` optional)                                                                                                                                     |
| `NOTIFICATIONS_DELIVERY`                                                                     | `queue`                                                                | `queue` (the worker sends and retries)                                                                                                                                                       |
| `PAYMENTS_PROVIDER`                                                                          | `disabled`                                                             | `razorpay` at launch (`fake` is refused in production)                                                                                                                                       |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`                          | empty                                                                  | Razorpay dashboard; enable auto-capture; webhook URL `https://api.abhiyantrisetu.com/v1/webhooks/razorpay` with `payment.captured`, `payment.failed`, `refund.processed` and `refund.failed` |
| `PLATFORM_FEE_BPS`                                                                           | `0`                                                                    | platform fee kept on release, in basis points (`500` = 5%)                                                                                                                                   |
| `CORS_ORIGINS`                                                                               | `https://abhiyantrisetu.com,https://www.abhiyantrisetu.com`            | add the admin and vendor portals                                                                                                                                                             |

The API refuses to start with missing or unsafe settings and prints `Invalid environment` with the reason.

## Release steps

1. Build and push the image:
   ```bash
   docker build -f apps/api/Dockerfile -t setu-api .
   aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.ap-south-1.amazonaws.com
   docker tag setu-api <account>.dkr.ecr.ap-south-1.amazonaws.com/setu-api:<git-sha>
   docker push <account>.dkr.ecr.ap-south-1.amazonaws.com/setu-api:<git-sha>
   ```
2. Run migrations as a one-off ECS task with the new image and the command `node dist/db/migrate.js`.
3. Update the API service (command `node dist/main.js`) and the worker service (command `node dist/worker.js`) to the new image tag.
4. Check `https://api.abhiyantrisetu.com/v1/health` returns `{"status":"ok","db":"up"}`.
5. In Vercel, set `NEXT_PUBLIC_API_URL=https://api.abhiyantrisetu.com` and redeploy the website so the early-access form posts to it.

## Reading the early-access list

Staff accounts (role `ops`, `support` or `super_admin`) can call:

- `GET /v1/admin/waitlist?role=provider&sector=Sector%20Pi` for a filtered list
- `GET /v1/admin/waitlist/summary` for counts by role and sector
- `GET /v1/admin/waitlist/export.csv` for a spreadsheet

The admin portal (`apps/admin`, see its README) shows this list with filters and a CSV download. Give your own account a staff role once in the database (`update users set roles = '{customer,super_admin}' where phone = '+91…'`), then sign in there.

## Running more than one API task

Rate limits are kept in Redis (`THROTTLE_STORE=redis`, the production default), so they hold across tasks behind the load balancer.

## Photo storage (S3)

Customers attach photos to requirements; the apps upload them straight to S3 with signed links that expire (10 minutes to upload, 30 minutes to view). The bucket stays private.

1. Create a bucket in `ap-south-1` (e.g. `setu-uploads`) with **Block all public access** on.
2. Create an IAM user for the API with only this policy, and an access key for it:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject"],
         "Resource": "arn:aws:s3:::setu-uploads/u/*"
       }
     ]
   }
   ```
3. Bucket CORS, so the website and web previews can upload (the phone apps don't need it):
   ```json
   [
     {
       "AllowedMethods": ["PUT", "GET"],
       "AllowedOrigins": ["https://abhiyantrisetu.com"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. Set `STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_REGION=ap-south-1`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`. Until then photo uploads answer _Photo uploads open at launch_; posting without photos works.
