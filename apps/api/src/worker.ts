/**
 * BullMQ worker process. Same codebase and modules as the API, separate deployable
 * (ECS service scaled on queue depth). Runs scheduled maintenance and delivers queued
 * notifications (WhatsApp, push) with retries.
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
import { NotificationsModule } from './modules/notifications/notifications.module';
import {
  NOTIFICATIONS_QUEUE,
  NotificationsService,
} from './modules/notifications/notifications.service';

export const QUEUES = { maintenance: 'maintenance' } as const;

@Module({
  imports: [
    ConfigModule,
    DbModule,
    EventEmitterModule.forRoot(),
    JwtModule.register({}),
    JobsModule,
    NotificationsModule,
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

  const notificationsService = app.get(NotificationsService);
  const notifier = new Worker(
    NOTIFICATIONS_QUEUE,
    // Throwing marks the attempt failed; BullMQ retries with the backoff set when queued.
    async (job) => notificationsService.deliver(job.data.notificationId as string),
    { connection, concurrency: 10 },
  );
  notifier.on('failed', (job, err) =>
    logger.warn(
      `notification ${job?.data?.notificationId} attempt ${job?.attemptsMade}: ${err.message}`,
    ),
  );

  const shutdown = async () => {
    await worker.close();
    await notifier.close();
    await queue.close();
    await connection.quit();
    await app.close();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  logger.log('Worker started');
}

void main();
