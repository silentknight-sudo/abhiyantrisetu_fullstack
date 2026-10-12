import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Locale } from '@setu/domain';
import { and, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { hmac, numericCode, safeEqualHex } from '../../common/crypto';
import { ENV, type Env } from '../../config/env';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { otpChallenges } from '../../db/schema';
import { SMS_PROVIDER, type SmsProvider } from './sms/sms.provider';

export const OTP_POLICY = {
  digits: 6,
  ttlMs: 5 * 60_000,
  resendCooldownMs: 30_000,
  maxSendsPerPhonePerHour: 5,
  maxSendsPerIpPerHour: 20,
  maxAttempts: 5,
} as const;

class TooManyRequests extends HttpException {
  constructor(message: string, retryAfterSeconds?: number) {
    super({ code: 'RATE_LIMITED', message, retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class OtpService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  private hash(phone: string, code: string) {
    // Bind the hash to the phone so a leaked hash cannot be replayed for another number.
    return hmac(this.env.OTP_HASH_SECRET, `${phone}:${code}`);
  }

  async send(phone: string, ip: string | undefined, locale: Locale = 'en') {
    const hourAgo = new Date(Date.now() - 60 * 60_000);

    const [latest] = await this.db
      .select({ createdAt: otpChallenges.createdAt })
      .from(otpChallenges)
      .where(eq(otpChallenges.phone, phone))
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);
    if (latest) {
      const wait = OTP_POLICY.resendCooldownMs - (Date.now() - latest.createdAt.getTime());
      if (wait > 0)
        throw new TooManyRequests(
          'Please wait before requesting another code',
          Math.ceil(wait / 1000),
        );
    }

    const [{ n: phoneCount } = { n: 0 }] = await this.db
      .select({ n: count() })
      .from(otpChallenges)
      .where(and(eq(otpChallenges.phone, phone), gt(otpChallenges.createdAt, hourAgo)));
    if (phoneCount >= OTP_POLICY.maxSendsPerPhonePerHour) {
      throw new TooManyRequests('Too many codes requested for this number. Try again in an hour.');
    }
    if (ip) {
      const [{ n: ipCount } = { n: 0 }] = await this.db
        .select({ n: count() })
        .from(otpChallenges)
        .where(and(eq(otpChallenges.ip, ip), gt(otpChallenges.createdAt, hourAgo)));
      if (ipCount >= OTP_POLICY.maxSendsPerIpPerHour) {
        throw new TooManyRequests('Too many requests from this network. Try again later.');
      }
    }

    const code = numericCode(OTP_POLICY.digits);
    // Only the newest challenge is valid; retire earlier ones for this phone.
    await this.db
      .update(otpChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(otpChallenges.phone, phone), isNull(otpChallenges.consumedAt)));
    await this.db.insert(otpChallenges).values({
      phone,
      codeHash: this.hash(phone, code),
      expiresAt: new Date(Date.now() + OTP_POLICY.ttlMs),
      ip,
    });
    await this.sms.sendOtp(phone, code, locale);

    return {
      expiresInSeconds: OTP_POLICY.ttlMs / 1000,
      resendAfterSeconds: OTP_POLICY.resendCooldownMs / 1000,
    };
  }

  /** Throws unless `code` matches the live challenge; consumes it on success. */
  async verify(phone: string, code: string): Promise<void> {
    const [challenge] = await this.db
      .select()
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.phone, phone),
          isNull(otpChallenges.consumedAt),
          gt(otpChallenges.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);
    if (!challenge) {
      throw new BadRequestException({
        code: 'OTP_EXPIRED',
        message: 'Code expired. Request a new one.',
      });
    }

    // Count the attempt before comparing so parallel guesses cannot exceed the limit.
    const [bumped] = await this.db
      .update(otpChallenges)
      .set({ attempts: sql`${otpChallenges.attempts} + 1` })
      .where(and(eq(otpChallenges.id, challenge.id), isNull(otpChallenges.consumedAt)))
      .returning({ attempts: otpChallenges.attempts });
    if (!bumped || bumped.attempts > OTP_POLICY.maxAttempts) {
      await this.db
        .update(otpChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(otpChallenges.id, challenge.id));
      throw new TooManyRequests('Too many wrong attempts. Request a new code.');
    }

    if (!safeEqualHex(challenge.codeHash, this.hash(phone, code))) {
      throw new BadRequestException({ code: 'OTP_INVALID', message: 'Incorrect code' });
    }

    const [consumed] = await this.db
      .update(otpChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(otpChallenges.id, challenge.id), isNull(otpChallenges.consumedAt)))
      .returning({ id: otpChallenges.id });
    if (!consumed) {
      throw new BadRequestException({
        code: 'OTP_EXPIRED',
        message: 'Code already used. Request a new one.',
      });
    }
  }
}
