/**
 * BullMQ worker process. Same codebase and modules as the API, separate deployable
 * (ECS service scaled on queue depth). Phase 1 adds lead fan-out, WhatsApp and payouts.
 */
import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigModule } from './config/config.module';
import { ENV, type Env } from './config/env';
import { DbModule } from './db/db.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { JobsService } from './modules/jobs/jobs.service';

export const QUEUES = { maintenance: 'maintenance' } as const;

@Module({
  imports: [
    ConfigModule,
    DbModule,
    EventEmitterModule.forRoot(),
    JwtModule.register({}),
    JobsModule,
  ],
})
class WorkerModule {}

async function main() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  const env = app.get<Env>(ENV);
  const jobsService = app.get(JobsService);
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const queue = new Queue(QUEUES.maintenance, { connection });
  await queue.upsertJobScheduler(
    'jobs-auto-confirm',
    { every: 15 * 60_000 },
    { name: 'jobs-auto-confirm' },
  );

  const worker = new Worker(
    QUEUES.maintenance,
    async (job) => {
      if (job.name === 'jobs-auto-confirm') {
        const closed = await jobsService.autoConfirmDue();
        if (closed.length) logger.log(`Auto-confirmed ${closed.length} job(s)`);
        return { closed: closed.length };
      }
      throw new Error(`Unknown job ${job.name}`);
    },
    { connection, concurrency: 1 },
  );
  worker.on('failed', (job, err) => logger.error(`${job?.name} failed: ${err.message}`));

  const shutdown = async () => {
    await worker.close();
    await queue.close();
    await connection.quit();
    await app.close();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  logger.log('Worker started');
}

void main();
