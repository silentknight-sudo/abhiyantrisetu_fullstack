import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type IORedis from 'ioredis';
import { randomUUID } from 'node:crypto';

/**
 * Sliding-window hit counter + block flag, atomically. Same semantics as the in-memory
 * store: hits within `ttl` count; at the limit the key is blocked for `blockDuration`.
 * Returns [totalHits, msToExpire, isBlocked, msToBlockExpire].
 */
const SCRIPT = `
local hits, block = KEYS[1], KEYS[2]
local now, ttl, limit, blockMs, member = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4]), ARGV[5]
redis.call('ZREMRANGEBYSCORE', hits, '-inf', now - ttl)
local count = redis.call('ZCARD', hits)
local function expiry()
  local oldest = redis.call('ZRANGE', hits, 0, 0, 'WITHSCORES')
  if oldest[2] then return tonumber(oldest[2]) + ttl - now end
  return ttl
end
local blocked = redis.call('PTTL', block)
if blocked > 0 then return {count + 1, expiry(), 1, blocked} end
if count >= limit then
  redis.call('SET', block, '1', 'PX', blockMs)
  return {count + 1, expiry(), 1, blockMs}
end
redis.call('ZADD', hits, now, member)
redis.call('PEXPIRE', hits, ttl)
return {count + 1, expiry(), 0, 0}
`;

/** Rate limits shared by every API task, so limits hold behind a load balancer. */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger('RateLimit');
  private warnedAt = 0;

  constructor(
    private readonly redis: IORedis,
    private readonly prefix = 'setu:throttle:',
  ) {
    redis.defineCommand('setuThrottle', { numberOfKeys: 2, lua: SCRIPT });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const base = `${this.prefix}${throttlerName}:${key}`;
    try {
      const [totalHits, msToExpire, blocked, msToBlockExpire] = (await (
        this.redis as unknown as {
          setuThrottle(...args: (string | number)[]): Promise<number[]>;
        }
      ).setuThrottle(
        `${base}:hits`,
        `${base}:block`,
        Date.now(),
        ttl,
        limit,
        blockDuration,
        randomUUID(),
      )) as [number, number, number, number];
      return {
        totalHits,
        timeToExpire: Math.ceil(msToExpire / 1000),
        isBlocked: blocked === 1,
        timeToBlockExpire: Math.ceil(msToBlockExpire / 1000),
      };
    } catch (err) {
      // Fail open: an outage of the limiter must not take the API down. OTP keeps its own
      // per-phone limits in Postgres regardless.
      if (Date.now() - this.warnedAt > 60_000) {
        this.warnedAt = Date.now();
        this.logger.warn(`Rate limiting unavailable, allowing requests: ${(err as Error).message}`);
      }
      return {
        totalHits: 0,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
