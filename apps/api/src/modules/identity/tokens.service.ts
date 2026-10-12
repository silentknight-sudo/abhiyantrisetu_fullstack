import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@setu/domain';
import { and, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AccessTokenPayload } from '../../common/auth';
import { opaqueToken, sha256 } from '../../common/crypto';
import { ENV, type Env } from '../../config/env';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { refreshTokens, users } from '../../db/schema';

export interface IssuedTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

interface SessionMeta {
  deviceId?: string;
  userAgent?: string;
}

@Injectable()
export class TokensService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  private async signAccess(userId: string, roles: Role[]) {
    const payload: AccessTokenPayload = { sub: userId, roles };
    return this.jwt.signAsync(payload, { expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS });
  }

  private async insertRefresh(
    db: Pick<Db, 'insert'>,
    userId: string,
    familyId: string,
    meta: SessionMeta,
  ) {
    const token = opaqueToken();
    await db.insert(refreshTokens).values({
      userId,
      familyId,
      tokenHash: sha256(token),
      deviceId: meta.deviceId,
      userAgent: meta.userAgent?.slice(0, 256),
      expiresAt: new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    });
    return token;
  }

  async issue(userId: string, roles: Role[], meta: SessionMeta): Promise<IssuedTokens> {
    const refreshToken = await this.insertRefresh(this.db, userId, randomUUID(), meta);
    return {
      accessToken: await this.signAccess(userId, roles),
      accessTokenExpiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
      refreshToken,
    };
  }

  /**
   * Rotates a refresh token. Presenting an already-rotated token means it was stolen or
   * replayed, so the whole login family is revoked.
   */
  async rotate(refreshToken: string, meta: SessionMeta): Promise<IssuedTokens> {
    const result = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, sha256(refreshToken)))
        .for('update');
      if (!row) return { error: 'Invalid refresh token' } as const;

      if (row.rotatedAt || row.revokedAt) {
        await tx
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(and(eq(refreshTokens.familyId, row.familyId), isNull(refreshTokens.revokedAt)));
        return { error: 'Session revoked. Please log in again.' } as const;
      }
      if (row.expiresAt.getTime() <= Date.now()) return { error: 'Session expired' } as const;

      const [user] = await tx
        .select({ id: users.id, roles: users.roles, status: users.status })
        .from(users)
        .where(eq(users.id, row.userId));
      if (!user || user.status !== 'active') return { error: 'Account unavailable' } as const;

      await tx
        .update(refreshTokens)
        .set({ rotatedAt: new Date() })
        .where(eq(refreshTokens.id, row.id));
      const next = await this.insertRefresh(tx, user.id, row.familyId, {
        deviceId: meta.deviceId ?? row.deviceId ?? undefined,
        userAgent: meta.userAgent,
      });
      return { user, refreshToken: next } as const;
    });

    // Throw outside the transaction so the family revocation above is committed.
    if ('error' in result) throw new UnauthorizedException(result.error);
    return {
      accessToken: await this.signAccess(result.user.id, result.user.roles),
      accessTokenExpiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: result.refreshToken,
    };
  }

  /** Logout: revoke the whole family of the presented token. */
  async revoke(refreshToken: string): Promise<void> {
    const [row] = await this.db
      .select({ familyId: refreshTokens.familyId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, sha256(refreshToken)));
    if (!row) return;
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, row.familyId), isNull(refreshTokens.revokedAt)));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}
