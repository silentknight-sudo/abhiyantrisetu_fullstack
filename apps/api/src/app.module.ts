import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AuthGuard } from './common/auth';
import { ConfigModule } from './config/config.module';
import { ENV, type Env } from './config/env';
import { DbModule } from './db/db.module';
import { RateLimitModule, THROTTLER_STORAGE_REDIS } from './common/rate-limit.module';
import type { RedisThrottlerStorage } from './common/redis-throttler.storage';
import { CatalogController } from './modules/catalog/catalog.controller';
import { HealthController } from './modules/health/health.controller';
import { IdentityModule } from './modules/identity/identity.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { RequirementsModule } from './modules/requirements/requirements.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { MatchingModule } from './modules/matching/matching.module';
import { PartnersModule } from './modules/partners/partners.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { StorageModule } from './modules/storage/storage.module';
import { ReviewsModule } from './modules/reviews/reviews.module';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        signOptions: { issuer: 'abhiyantrisetu', audience: 'setu-api' },
        verifyOptions: { issuer: 'abhiyantrisetu', audience: 'setu-api' },
      }),
    }),
    // Per-IP limits, shared through Redis in production so they hold across API tasks.
    ThrottlerModule.forRootAsync({
      imports: [RateLimitModule],
      inject: [THROTTLER_STORAGE_REDIS],
      useFactory: (storage: RedisThrottlerStorage | null) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
        ...(storage ? { storage } : {}),
      }),
    }),
    IdentityModule,
    RequirementsModule,
    JobsModule,
    WaitlistModule,
    PartnersModule,
    MatchingModule,
    QuotesModule,
    NotificationsModule,
    PaymentsModule,
    AdminModule,
    StorageModule,
    ReviewsModule,
  ],
  controllers: [HealthController, CatalogController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
