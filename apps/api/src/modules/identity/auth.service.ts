import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthTokens } from '@setu/schemas';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { users } from '../../db/schema';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(TokensService) private readonly tokens: TokensService,
  ) {}

  async verifyAndLogin(
    input: { phone: string; code: string; deviceId?: string },
    meta: { userAgent?: string },
  ): Promise<AuthTokens> {
    await this.otp.verify(input.phone, input.code);

    // xmax = 0 identifies a freshly inserted row in an upsert.
    const [user] = await this.db
      .insert(users)
      .values({ phone: input.phone, lastLoginAt: new Date() })
      .onConflictDoUpdate({ target: users.phone, set: { lastLoginAt: new Date() } })
      .returning({
        id: users.id,
        phone: users.phone,
        name: users.name,
        roles: users.roles,
        status: users.status,
        boundDeviceId: users.boundDeviceId,
        isNew: sql<boolean>`(xmax = 0)`,
      });
    if (!user) throw new Error('upsert returned no row');
    if (user.status !== 'active') throw new ForbiddenException('This account is not active');

    // Partner accounts are bound to the first device they verify on.
    if (user.roles.includes('partner') && input.deviceId) {
      if (user.boundDeviceId && user.boundDeviceId !== input.deviceId) {
        throw new ForbiddenException({
          code: 'DEVICE_NOT_RECOGNISED',
          message:
            'This partner account is linked to another phone. Contact Setu support to move it.',
        });
      }
      if (!user.boundDeviceId) {
        await this.db
          .update(users)
          .set({ boundDeviceId: input.deviceId })
          .where(eq(users.id, user.id));
      }
    }

    const issued = await this.tokens.issue(user.id, user.roles, {
      deviceId: input.deviceId,
      userAgent: meta.userAgent,
    });
    return {
      ...issued,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        roles: user.roles,
        isNew: user.isNew,
      },
    };
  }
}
