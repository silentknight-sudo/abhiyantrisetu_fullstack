import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AuthGuard } from './common/auth';
import { ConfigModule } from './config/config.module';
import { ENV, type Env } from './config/env';
import { DbModule } from './db/db.module';
import { CatalogController } from './modules/catalog/catalog.controller';
import { HealthController } from './modules/health/health.controller';
import { IdentityModule } from './modules/identity/identity.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { RequirementsModule } from './modules/requirements/requirements.module';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        signOptions: { issuer: 'abhiyantrisetu', audience: 'setu-api' },
        verifyOptions: { issuer: 'abhiyantrisetu', audience: 'setu-api' },
      }),
    }),
    // Per-IP limits. In-memory store: move to a Redis store before running >1 API task.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    IdentityModule,
    RequirementsModule,
    JobsModule,
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
