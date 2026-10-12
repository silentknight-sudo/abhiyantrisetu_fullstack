/**
 * Writes openapi.json without a database, for generating packages/api-client.
 * Usage: pnpm --filter @setu/api openapi
 */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildOpenApi, configureApp } from './bootstrap';

async function main() {
  process.env.DATABASE_URL ??= 'postgres://openapi:openapi@localhost:5432/openapi';
  process.env.JWT_ACCESS_SECRET ??= 'x'.repeat(32);
  process.env.OTP_HASH_SECRET ??= 'x'.repeat(32);
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  configureApp(app, { CORS_ORIGINS: [] });
  await app.init();
  const out = path.resolve(__dirname, '../openapi.json');
  writeFileSync(out, JSON.stringify(buildOpenApi(app), null, 2));
  await app.close();
  console.log(`Wrote ${out}`);
}

void main();
