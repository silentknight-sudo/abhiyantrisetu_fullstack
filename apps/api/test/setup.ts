import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { normalizeIndianMobile } from '@setu/domain';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { createDb, type Db } from '../src/db/client';
import { DB } from '../src/db/db.module';
import { runMigrations } from '../src/db/migrate';
import { otpChallenges } from '../src/db/schema';
import { ConsoleSmsProvider } from '../src/modules/identity/sms/console.provider';
import { SMS_PROVIDER } from '../src/modules/identity/sms/sms.provider';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://setu:setu@localhost:5432/setu_test';

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef0123',
  OTP_HASH_SECRET: 'test-otp-secret-0123456789abcdef01234567',
  SMS_PROVIDER: 'console',
  WHATSAPP_APP_SECRET: 'test-whatsapp-app-secret',
  WHATSAPP_VERIFY_TOKEN: 'test-verify-token',
  RAZORPAY_KEY_SECRET: 'test-razorpay-key-secret',
  RAZORPAY_WEBHOOK_SECRET: 'test-razorpay-webhook-secret',
});

export interface TestContext {
  app: INestApplication;
  db: Db;
  sms: ConsoleSmsProvider;
  http: () => ReturnType<typeof request>;
}

let ipCounter = 1;
/** Distinct client IP per call so per-IP limits don't couple unrelated tests. */
export const freshIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

export async function createTestApp(): Promise<TestContext> {
  await runMigrations(TEST_DATABASE_URL);
  const { db: admin, sql: adminSql } = createDb(TEST_DATABASE_URL, { max: 1 });
  await admin.execute(sql`
    DO $$ DECLARE r record; BEGIN
      FOR r IN SELECT tablename FROM pg_tables
               WHERE schemaname = 'public' AND tablename <> 'spatial_ref_sys' LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;`);
  await adminSql.end();

  const sms = new ConsoleSmsProvider();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SMS_PROVIDER)
    .useValue(sms)
    .compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: false, rawBody: true }), {
    CORS_ORIGINS: [],
  });
  await app.init();
  return { app, db: app.get<Db>(DB), sms, http: () => request(app.getHttpServer()) };
}

/** Pretends earlier OTPs were sent a minute ago, so the resend cooldown has passed. */
export async function skipOtpCooldown(ctx: TestContext) {
  await ctx.db.update(otpChallenges).set({ createdAt: new Date(Date.now() - 60_000) });
}

/** Full OTP login; returns tokens and the user. */
export async function login(ctx: TestContext, phone: string, deviceId?: string) {
  await skipOtpCooldown(ctx);
  const ip = freshIp();
  await ctx.http().post('/v1/auth/otp/send').set('x-forwarded-for', ip).send({ phone }).expect(200);
  const code = ctx.sms.lastCodeFor(normalizeIndianMobile(phone)!)!;
  const res = await ctx
    .http()
    .post('/v1/auth/otp/verify')
    .set('x-forwarded-for', ip)
    .send({ phone, code, deviceId })
    .expect(200);
  return res.body as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; roles: string[]; isNew: boolean };
  };
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
