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
    SMS_PROVIDER: z.enum(['console', 'msg91']).default('console'),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_OTP_TEMPLATE_ID: z.string().optional(),
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
