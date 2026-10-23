import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { JobState } from '@setu/domain';
import { eq, inArray, sql } from 'drizzle-orm';
import {
  DomainEvents,
  type JobHiredEvent,
  type JobTransitionedEvent,
  type LeadsCreatedEvent,
  type QuoteSentEvent,
} from '../../common/events';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { addresses, jobs, leads, partners, requirements } from '../../db/schema';
import { NotificationsService } from './notifications.service';

/** States the customer hears about, and states the partner hears about. */
const CUSTOMER_STATES: JobState[] = ['scheduled', 'in_progress', 'completed'];
const PARTNER_STATES: JobState[] = ['closed'];
const BOTH_STATES: JobState[] = ['cancelled', 'disputed'];

/** Turns domain events into notifications. A failure here never affects the action. */
@Injectable()
export class NotificationListeners {
  private readonly logger = new Logger('NotificationListeners');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  private async safely(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (err) {
      this.logger.error(`${label}: ${(err as Error).message}`);
    }
  }

  @OnEvent(DomainEvents.LeadsCreated, { promisify: true })
  onLeads(e: LeadsCreatedEvent) {
    return this.safely('leads.created', async () => {
      const rows = await this.db
        .select({
          leadId: leads.id,
          partnerUserId: partners.userId,
          title: requirements.title,
          budgetMaxPaise: requirements.budgetMaxPaise,
          sector: addresses.sector,
          city: addresses.city,
          distanceKm: sql<string>`round((ST_Distance(${partners.baseLocation}, ${addresses.location}) / 1000.0)::numeric, 1)::text`,
        })
        .from(leads)
        .innerJoin(partners, eq(partners.id, leads.partnerId))
        .innerJoin(requirements, eq(requirements.id, leads.requirementId))
        .innerJoin(addresses, eq(addresses.id, requirements.addressId))
        .where(inArray(leads.id, e.leadIds));
      for (const r of rows) {
        await this.notifications.notify(r.partnerUserId, 'lead_new', {
          leadId: r.leadId,
          title: r.title,
          sector: r.sector ?? r.city,
          distanceKm: r.distanceKm,
          budgetPaise: r.budgetMaxPaise ?? undefined,
        });
      }
    });
  }

  @OnEvent(DomainEvents.QuoteSent, { promisify: true })
  @OnEvent(DomainEvents.QuoteRevised, { promisify: true })
  onQuote(e: QuoteSentEvent) {
    return this.safely('quote.sent', async () => {
      const [r] = await this.db
        .select({
          customerId: requirements.customerId,
          title: requirements.title,
          partnerName: partners.displayName,
        })
        .from(requirements)
        .innerJoin(partners, eq(partners.id, e.partnerId))
        .where(eq(requirements.id, e.requirementId));
      if (!r) return;
      await this.notifications.notify(r.customerId, 'quote_received', {
        requirementId: e.requirementId,
        title: r.title,
        partnerName: r.partnerName,
        totalPaise: e.totalPaise,
      });
    });
  }

  @OnEvent(DomainEvents.JobHired, { promisify: true })
  onHired(e: JobHiredEvent) {
    return this.safely('job.hired', async () => {
      const [r] = await this.db
        .select({
          partnerUserId: partners.userId,
          title: requirements.title,
          sector: addresses.sector,
          city: addresses.city,
        })
        .from(jobs)
        .innerJoin(partners, eq(partners.id, jobs.partnerId))
        .innerJoin(requirements, eq(requirements.id, jobs.requirementId))
        .innerJoin(addresses, eq(addresses.id, requirements.addressId))
        .where(eq(jobs.id, e.jobId));
      if (!r) return;
      await this.notifications.notify(r.partnerUserId, 'hired', {
        jobId: e.jobId,
        title: r.title,
        sector: r.sector ?? r.city,
      });
    });
  }

  @OnEvent(DomainEvents.JobTransitioned, { promisify: true })
  onTransition(e: JobTransitionedEvent) {
    return this.safely('job.transitioned', async () => {
      if (e.from === e.to) return; // reschedules are announced by the app, not here
      const [r] = await this.db
        .select({ title: requirements.title, partnerUserId: partners.userId })
        .from(jobs)
        .innerJoin(requirements, eq(requirements.id, jobs.requirementId))
        .innerJoin(partners, eq(partners.id, jobs.partnerId))
        .where(eq(jobs.id, e.jobId));
      if (!r) return;
      const recipients = new Set<string>();
      if (CUSTOMER_STATES.includes(e.to) || BOTH_STATES.includes(e.to))
        recipients.add(e.customerId);
      if (PARTNER_STATES.includes(e.to) || BOTH_STATES.includes(e.to))
        recipients.add(r.partnerUserId);
      // Nobody needs a message about their own action.
      if (e.actorUserId) recipients.delete(e.actorUserId);
      for (const userId of recipients) {
        await this.notifications.notify(userId, 'job_update', {
          jobId: e.jobId,
          title: r.title,
          state: e.to,
        });
      }
    });
  }
}
