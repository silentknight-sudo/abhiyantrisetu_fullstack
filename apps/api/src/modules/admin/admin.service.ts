import { Inject, Injectable } from '@nestjs/common';
import { JOB_STATES, type JobState } from '@setu/domain';
import { alias } from 'drizzle-orm/pg-core';
import { count, desc, eq, inArray, like, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import {
  jobs,
  ledgerEntries,
  partners,
  requirements,
  users,
  waitlistSignups,
} from '../../db/schema';

const ACTIVE: JobState[] = ['hired', 'scheduled', 'in_progress', 'completed'];

/** Read-only views for the admin portal. Changes go through the owning modules. */
@Injectable()
export class AdminService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async overview() {
    const balance = (pattern: string) =>
      this.db
        .select({
          n: sql<string>`coalesce(sum(${ledgerEntries.creditPaise} - ${ledgerEntries.debitPaise}), 0)`,
        })
        .from(ledgerEntries)
        .where(like(ledgerEntries.account, pattern))
        .then(([r]) => Number(r?.n ?? 0));
    const [byStatus, [open], byState, [waitlist], held, owed] = await Promise.all([
      this.db
        .select({ status: partners.verificationStatus, n: count() })
        .from(partners)
        .groupBy(partners.verificationStatus),
      this.db
        .select({ n: count() })
        .from(requirements)
        .where(inArray(requirements.status, ['requested', 'matched', 'quoted'])),
      this.db.select({ state: jobs.state, n: count() }).from(jobs).groupBy(jobs.state),
      this.db.select({ n: count() }).from(waitlistSignups),
      balance('held:job:%'),
      balance('partner_payable:%'),
    ]);
    const partnersBy = (s: string) => byStatus.find((r) => r.status === s)?.n ?? 0;
    const jobsIn = (states: string[]) =>
      byState.filter((r) => states.includes(r.state)).reduce((sum, r) => sum + r.n, 0);
    return {
      partners: {
        pending: partnersBy('pending'),
        inReview: partnersBy('in_review'),
        verified: partnersBy('verified'),
      },
      openRequirements: open?.n ?? 0,
      activeJobs: jobsIn(ACTIVE),
      disputedJobs: jobsIn(['disputed']),
      waitlist: waitlist?.n ?? 0,
      heldPaise: held,
      owedToPartnersPaise: owed,
    };
  }

  /** Jobs with who is involved, newest first; `state` narrows it (e.g. the dispute desk). */
  async jobs(state?: (typeof JOB_STATES)[number]) {
    const customer = alias(users, 'customer');
    const partnerUser = alias(users, 'partner_user');
    const rows = await this.db
      .select({
        job: jobs,
        title: requirements.title,
        customerPhone: customer.phone,
        customerName: customer.name,
        partnerName: partners.displayName,
        partnerPhone: partnerUser.phone,
      })
      .from(jobs)
      .innerJoin(requirements, eq(requirements.id, jobs.requirementId))
      .innerJoin(customer, eq(customer.id, jobs.customerId))
      .innerJoin(partners, eq(partners.id, jobs.partnerId))
      .innerJoin(partnerUser, eq(partnerUser.id, partners.userId))
      .where(state ? eq(jobs.state, state) : undefined)
      .orderBy(desc(jobs.updatedAt))
      .limit(200);
    return rows.map(({ job, ...who }) => {
      const { startCodeHash: _h, startCodeAttempts: _a, ...rest } = job;
      return { ...rest, ...who };
    });
  }
}
