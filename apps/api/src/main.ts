import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApi, configureApp } from './bootstrap';
import { ENV, type Env } from './config/env';

async function main() {
  const app = await NestFactory.create(AppModule);
  const env = app.get<Env>(ENV);
  configureApp(app, env);
  if (env.NODE_ENV !== 'production') SwaggerModule.setup('docs', app, buildOpenApi(app));
  await app.listen(env.PORT);
}

void main();
