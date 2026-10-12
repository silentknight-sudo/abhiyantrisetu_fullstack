import { type INestApplication, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { Env } from './config/env';

/** Shared by main.ts and the e2e tests so tests exercise the real HTTP setup. */
export function configureApp(app: INestApplication, env: Pick<Env, 'CORS_ORIGINS'>) {
  app.use(helmet());
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
  // Behind Cloudflare/ALB: trust X-Forwarded-For for per-IP limits.
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  return app;
}

export function buildOpenApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Abhiyantri Setu API')
    .setVersion('1')
    .addBearerAuth()
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}
