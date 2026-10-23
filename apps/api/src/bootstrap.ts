import { type INestApplication, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
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
  const doc = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  // Every operation can fail with the same error body; document it once as `default`.
  doc.components = { ...doc.components, schemas: { ...doc.components?.schemas, ApiError } };
  for (const item of Object.values(doc.paths)) {
    for (const method of ['get', 'put', 'post', 'patch', 'delete'] as const) {
      const op = item[method];
      if (op) {
        op.responses.default ??= {
          description: 'Error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        };
      }
    }
  }
  return doc;
}

/** Error body: Nest's default shape, plus `code` for errors clients handle specially. */
const ApiError: SchemaObject = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    message: {
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    code: { type: 'string', description: 'Machine-readable reason, e.g. ALREADY_PAID' },
    errors: {
      type: 'array',
      description: 'Validation issues',
      items: { type: 'object', properties: { message: { type: 'string' } } },
    },
  },
  required: ['message'],
};
