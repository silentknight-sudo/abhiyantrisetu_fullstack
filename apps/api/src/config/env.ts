import { z } from 'zod';

const secret = z.string().min(32, 'must be at least 32 characters');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    JWT_ACCESS_SECRET: secret,
    OTP_HASH_SECRET: secret,
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    // disabled: login is switched off (pre-launch, before DLT approval); OTP requests get a 503.
    SMS_PROVIDER: z.enum(['console', 'msg91', 'disabled']).default('console'),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_OTP_TEMPLATE_ID: z.string().optional(),
    // WhatsApp Business (Meta Cloud API, directly or through a BSP that exposes it).
    WHATSAPP_PROVIDER: z.enum(['console', 'meta', 'disabled']).default('console'),
    WHATSAPP_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_APP_SECRET: z.string().optional(),
    WHATSAPP_VERIFY_TOKEN: z.string().optional(),
    // Push notifications through Expo (FCM + APNs).
    PUSH_PROVIDER: z.enum(['console', 'expo', 'disabled']).default('console'),
    EXPO_ACCESS_TOKEN: z.string().optional(),
    // Payments. fake: local order ids, same signature checks (dev/test only).
    PAYMENTS_PROVIDER: z.enum(['fake', 'razorpay', 'disabled']).default('fake'),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    /** Platform fee taken when a job's held money is released, in basis points (100 = 1%). */
    PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10_000).default(0),
    // inline: send during the request (dev/test). queue: hand to the BullMQ worker (production).
    NOTIFICATIONS_DELIVERY: z.enum(['inline', 'queue']).default('inline'),
    /** Where rate-limit counters live; `redis` is required to run more than one API task. */
    THROTTLE_STORE: z.enum(['memory', 'redis']).optional(),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((s) =>
        s
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      ),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.SMS_PROVIDER === 'console') {
      ctx.addIssue({
        code: 'custom',
        path: ['SMS_PROVIDER'],
        message: 'console SMS is not allowed in production',
      });
    }
    if (env.NODE_ENV === 'production' && env.PAYMENTS_PROVIDER === 'fake') {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYMENTS_PROVIDER'],
        message: 'fake payments are not allowed in production',
      });
    }
    if (
      env.PAYMENTS_PROVIDER === 'razorpay' &&
      (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['RAZORPAY_KEY_ID'],
        message:
          'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are required when PAYMENTS_PROVIDER=razorpay',
      });
    }
    for (const key of ['WHATSAPP_PROVIDER', 'PUSH_PROVIDER'] as const) {
      if (env.NODE_ENV === 'production' && env[key] === 'console') {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'console delivery is not allowed in production',
        });
      }
    }
    if (
      env.WHATSAPP_PROVIDER === 'meta' &&
      (!env.WHATSAPP_TOKEN ||
        !env.WHATSAPP_PHONE_NUMBER_ID ||
        !env.WHATSAPP_APP_SECRET ||
        !env.WHATSAPP_VERIFY_TOKEN)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['WHATSAPP_TOKEN'],
        message:
          'WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET and WHATSAPP_VERIFY_TOKEN are required when WHATSAPP_PROVIDER=meta',
      });
    }
    if (env.SMS_PROVIDER === 'msg91' && (!env.MSG91_AUTH_KEY || !env.MSG91_OTP_TEMPLATE_ID)) {
      ctx.addIssue({
        code: 'custom',
        path: ['MSG91_AUTH_KEY'],
        message: 'MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID are required when SMS_PROVIDER=msg91',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export const ENV = Symbol('ENV');

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}
