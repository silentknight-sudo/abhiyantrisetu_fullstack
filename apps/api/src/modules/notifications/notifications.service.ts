import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import IORedis from 'ioredis';
import { ENV, type Env } from '../../config/env';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { notifications, pushTokens, users } from '../../db/schema';
import { PUSH_PROVIDER, type PushProvider } from './providers/push.provider';
import { WHATSAPP_PROVIDER, type WhatsAppProvider } from './providers/whatsapp.provider';
import { render, type TemplateKey, type TemplateParams } from './templates';

export const NOTIFICATIONS_QUEUE = 'notifications';
type Channel = 'push' | 'whatsapp';

/**
 * Writes one notifications row per channel and delivers it: during the request in
 * development, or through the BullMQ worker in production (retries with backoff).
 */
@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger('Notifications');
  private queue?: Queue;
  private redis?: IORedis;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider,
  ) {}

  async onModuleDestroy() {
    await this.queue?.close();
    await this.redis?.quit();
  }

  private getQueue() {
    if (!this.queue) {
      this.redis = new IORedis(this.env.REDIS_URL, { maxRetriesPerRequest: null });
      this.queue = new Queue(NOTIFICATIONS_QUEUE, { connection: this.redis });
    }
    return this.queue;
  }

  async notify<K extends TemplateKey>(
    userId: string,
    template: K,
    params: TemplateParams[K],
    channels: Channel[] = ['push', 'whatsapp'],
  ) {
    const [user] = await this.db
      .select({ status: users.status, whatsappOptInAt: users.whatsappOptInAt })
      .from(users)
      .where(eq(users.id, userId));
    if (!user || user.status !== 'active') return [];
    const [{ n: tokenCount } = { n: 0 }] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    const rows = channels.map((channel) => {
      let skip: string | null = null;
      if (channel === 'whatsapp') {
        if (this.env.WHATSAPP_PROVIDER === 'disabled') skip = 'WhatsApp disabled';
        else if (!user.whatsappOptInAt) skip = 'No WhatsApp opt-in';
      } else if (this.env.PUSH_PROVIDER === 'disabled') skip = 'Push disabled';
      else if (tokenCount === 0) skip = 'No registered device';
      return {
        userId,
        channel,
        template,
        params,
        status: skip ? ('skipped' as const) : ('queued' as const),
        error: skip,
      };
    });
    const inserted = await this.db.insert(notifications).values(rows).returning();
    for (const row of inserted.filter((r) => r.status === 'queued')) {
      if (this.env.NOTIFICATIONS_DELIVERY === 'queue') {
        await this.getQueue().add(
          'deliver',
          { notificationId: row.id },
          { attempts: 4, backoff: { type: 'exponential', delay: 30_000 }, removeOnComplete: 1000 },
        );
      } else {
        await this.deliver(row.id).catch(() => undefined);
      }
    }
    return inserted;
  }

  /** Sends one queued notification. Throws on failure so the worker can retry. */
  async deliver(notificationId: string) {
    const [row] = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId));
    if (!row || row.status === 'sent' || row.status === 'skipped') return;
    const [user] = await this.db
      .select({ phone: users.phone, locale: users.locale })
      .from(users)
      .where(eq(users.id, row.userId));
    if (!user) return;
    const rendered = render(row.template as TemplateKey, row.params as never, user.locale);

    try {
      let providerRef: string | null = null;
      if (row.channel === 'whatsapp') {
        if (!rendered.whatsapp) throw new Error('No WhatsApp template');
        providerRef = await this.whatsapp.send({
          to: user.phone,
          template: rendered.whatsapp.name,
          language: user.locale === 'hi' ? 'hi' : 'en',
          bodyParams: rendered.whatsapp.bodyParams,
          buttonPayloads: rendered.whatsapp.buttonPayloads,
        });
      } else {
        const tokens = await this.db
          .select({ token: pushTokens.token })
          .from(pushTokens)
          .where(eq(pushTokens.userId, row.userId));
        const result = await this.push.send(
          tokens.map((t) => t.token),
          rendered.push,
        );
        if (result.deadTokens.length) {
          await this.db.delete(pushTokens).where(inArray(pushTokens.token, result.deadTokens));
        }
        if (!result.ok) throw new Error(result.error ?? 'Push failed');
      }
      await this.db
        .update(notifications)
        .set({
          status: 'sent',
          sentAt: new Date(),
          providerRef,
          attempts: row.attempts + 1,
          error: null,
        })
        .where(eq(notifications.id, notificationId));
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      this.logger.warn(`Delivery failed (${row.channel}/${row.template}): ${message}`);
      await this.db
        .update(notifications)
        .set({ status: 'failed', attempts: row.attempts + 1, error: message })
        .where(eq(notifications.id, notificationId));
      throw err;
    }
  }

  // ---------- user settings ----------

  async registerPushToken(userId: string, token: string, platform: string) {
    await this.db
      .insert(pushTokens)
      .values({ userId, token, platform })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { userId, platform, lastSeenAt: new Date() },
      });
  }

  async removePushToken(userId: string, token: string) {
    await this.db
      .delete(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
  }

  async setWhatsAppOptIn(userId: string, optIn: boolean) {
    await this.db
      .update(users)
      .set({ whatsappOptInAt: optIn ? new Date() : null })
      .where(eq(users.id, userId));
  }

  inbox(userId: string) {
    return this.db
      .select({
        id: notifications.id,
        channel: notifications.channel,
        template: notifications.template,
        params: notifications.params,
        status: notifications.status,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.channel, 'push')))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }
}
