import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';
import { ConfigModule } from '../config/config.module';
import { ENV, type Env } from '../config/env';
import { useRedisStore } from './rate-limit.module';

/**
 * Cuts off access tokens before they expire: suspending a user (or changing their roles)
 * records "tokens issued before now are void" for one access-token lifetime, and the auth
 * guard rejects older tokens. Redis in production so every instance sees it; memory in dev.
 */
@Injectable()
export class AccessRevocation implements OnModuleDestroy {
  private readonly redis: IORedis | null;
  private readonly memory = new Map<string, { at: number; until: number }>();
  private readonly ttl: number;

  constructor(@Inject(ENV) env: Env) {
    this.ttl = env.ACCESS_TOKEN_TTL_SECONDS;
    this.redis = useRedisStore(env)
      ? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
      : null;
  }

  private key = (userId: string) => `setu:revoked:${userId}`;

  /** Void every access token this user holds right now. */
  async revoke(userId: string): Promise<void> {
    const at = Math.floor(Date.now() / 1000);
    if (this.redis) {
      await this.redis.set(this.key(userId), String(at), 'EX', this.ttl + 60);
    } else {
      this.memory.set(userId, { at, until: Date.now() + (this.ttl + 60) * 1000 });
    }
  }

  /** True when a token issued at `iat` (seconds) was voided. Fails closed if Redis errors. */
  async isRevoked(userId: string, iat: number | undefined): Promise<boolean> {
    let at: number | undefined;
    if (this.redis) {
      try {
        const v = await this.redis.get(this.key(userId));
        at = v ? Number(v) : undefined;
      } catch {
        return true;
      }
    } else {
      const m = this.memory.get(userId);
      if (m && m.until < Date.now()) this.memory.delete(userId);
      else at = m?.at;
    }
    return at !== undefined && (iat ?? 0) <= at;
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }
}

@Global()
@Module({ imports: [ConfigModule], providers: [AccessRevocation], exports: [AccessRevocation] })
export class RevocationModule {}
