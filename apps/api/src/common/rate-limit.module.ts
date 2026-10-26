import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';
import { ConfigModule } from '../config/config.module';
import { ENV, type Env } from '../config/env';
import { RedisThrottlerStorage } from './redis-throttler.storage';

export const THROTTLER_STORAGE_REDIS = Symbol('THROTTLER_STORAGE_REDIS');
const THROTTLE_REDIS = Symbol('THROTTLE_REDIS');

/** Production (or THROTTLE_STORE=redis) keeps rate-limit counters in Redis; else memory. */
export const useRedisStore = (env: Env) =>
  (env.THROTTLE_STORE ?? (env.NODE_ENV === 'production' ? 'redis' : 'memory')) === 'redis';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: THROTTLE_REDIS,
      inject: [ENV],
      useFactory: (env: Env) =>
        useRedisStore(env)
          ? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
          : null,
    },
    {
      provide: THROTTLER_STORAGE_REDIS,
      inject: [THROTTLE_REDIS],
      useFactory: (redis: IORedis | null) => (redis ? new RedisThrottlerStorage(redis) : null),
    },
  ],
  exports: [THROTTLER_STORAGE_REDIS],
})
export class RateLimitModule implements OnModuleDestroy {
  constructor(@Inject(THROTTLE_REDIS) private readonly redis: IORedis | null) {}

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }
}
