import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CARE_PLANS, careVisits, REFERRAL_REWARD_PAISE } from '@setu/domain';
import type { SubscribeCarePlanInput } from '@setu/schemas';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { AuthUser } from '../../common/auth';
import { DomainEvents, type JobTransitionedEvent } from '../../common/events';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { addresses, amcSubscriptions, events, jobs, referrals, users } from '../../db/schema';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] ?? null;
const today = () => new Date().toISOString().slice(0, 10);

/** Refer-and-earn codes and care plans (AMC): reasons for customers to come back. */
@Injectable()
export class GrowthService {
  private readonly logger = new Logger(GrowthService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  // ---------- referrals ----------

  private async ensureCode(user: AuthUser) {
    const [mine] = await this.db.select().from(referrals).where(eq(referrals.userId, user.id));
    if (mine) return mine;
    const [u] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, user.id));
    const stem =
      (firstName(u?.name ?? null) ?? 'SETU')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 6) || 'SETU';
    for (let i = 0; i < 5; i++) {
      const code =
        stem + Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
      const [row] = await this.db
        .insert(referrals)
        .values({ userId: user.id, code })
        .onConflictDoNothing()
        .returning();
      if (row) return row;
      const [again] = await this.db.select().from(referrals).where(eq(referrals.userId, user.id));
      if (again) return again;
    }
    throw new ConflictException('Could not create a code, try again');
  }

  async mine(user: AuthUser) {
    const me = await this.ensureCode(user);
    const friends = await this.db
      .select({
        name: users.name,
        rewardedAt: referrals.rewardedAt,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .innerJoin(users, eq(users.id, referrals.userId))
      .where(eq(referrals.referredById, user.id))
      .orderBy(desc(referrals.createdAt));
    const [{ n: jobCount } = { n: 0 }] = await this.db
      .select({ n: count() })
      .from(jobs)
      .where(eq(jobs.customerId, user.id));
    const rewarded = friends.filter((f) => f.rewardedAt).length + (me.rewardedAt ? 1 : 0);
    return {
      code: me.code,
      rewardPaise: REFERRAL_REWARD_PAISE,
      earnedPaise: rewarded * REFERRAL_REWARD_PAISE,
      canApply: !me.referredById && jobCount === 0,
      referred: friends.map((f) => ({
        firstName: firstName(f.name),
        status: f.rewardedAt ? ('first_job_done' as const) : ('signed_up' as const),
        joinedAt: f.createdAt,
      })),
    };
  }

  /** A new customer enters a friend's code before their first booking. */
  async apply(user: AuthUser, code: string) {
    const me = await this.ensureCode(user);
    const [owner] = await this.db.select().from(referrals).where(eq(referrals.code, code));
    if (!owner) throw new NotFoundException('No such code');
    if (owner.userId === user.id) throw new BadRequestException('You cannot use your own code');
    if (me.referredById) throw new ConflictException('A code is already applied');
    const [{ n } = { n: 0 }] = await this.db
      .select({ n: count() })
      .from(jobs)
      .where(eq(jobs.customerId, user.id));
    if (n > 0) throw new ConflictException('Codes work only before your first booking');
    await this.db
      .update(referrals)
      .set({ referredById: owner.userId })
      .where(eq(referrals.userId, user.id));
    return this.mine(user);
  }

  /** The referred customer's first completed job earns both sides the reward. */
  @OnEvent(DomainEvents.JobTransitioned, { promisify: true })
  async onJobClosed(e: JobTransitionedEvent) {
    if (e.to !== 'closed') return;
    try {
      const [closed] = await this.db
        .select({ n: count() })
        .from(jobs)
        .where(and(eq(jobs.customerId, e.customerId), eq(jobs.state, 'closed')));
      if ((closed?.n ?? 0) !== 1) return;
      const [rewarded] = await this.db
        .update(referrals)
        .set({ rewardedAt: new Date() })
        .where(and(eq(referrals.userId, e.customerId), isNotNull(referrals.referredById)))
        .returning();
      if (rewarded?.rewardedAt) {
        await this.db.insert(events).values({
          userId: e.customerId,
          name: 'referral_rewarded',
          properties: { referredById: rewarded.referredById, amountPaise: REFERRAL_REWARD_PAISE },
        });
      }
    } catch (err) {
      this.logger.error(`Referral reward failed for job ${e.jobId}: ${(err as Error).message}`);
    }
  }

  // ---------- care plans ----------

  plans() {
    return CARE_PLANS.map((p) => ({ ...p, includes: [...p.includes] }));
  }

  private present(s: typeof amcSubscriptions.$inferSelect) {
    const plan = CARE_PLANS.find((p) => p.key === s.planKey);
    const t = today();
    return {
      id: s.id,
      planKey: s.planKey,
      planName: plan?.name ?? s.planKey,
      status: s.status,
      pricePaise: s.pricePaise,
      startsOn: s.startsOn,
      visits: s.visits,
      nextVisit: s.status === 'active' ? (s.visits.find((v) => v >= t) ?? null) : null,
      createdAt: s.createdAt,
    };
  }

  async subscriptions(user: AuthUser) {
    const rows = await this.db
      .select()
      .from(amcSubscriptions)
      .where(eq(amcSubscriptions.userId, user.id))
      .orderBy(desc(amcSubscriptions.createdAt));
    return rows.map((r) => this.present(r));
  }

  async subscribe(user: AuthUser, input: SubscribeCarePlanInput) {
    const plan = CARE_PLANS.find((p) => p.key === input.planKey);
    if (!plan) throw new BadRequestException('Unknown plan');
    const active = await this.db
      .select({ id: amcSubscriptions.id })
      .from(amcSubscriptions)
      .where(
        and(
          eq(amcSubscriptions.userId, user.id),
          eq(amcSubscriptions.planKey, plan.key),
          eq(amcSubscriptions.status, 'active'),
        ),
      );
    if (active.length) throw new ConflictException('You already have this plan');
    return this.db.transaction(async (tx) => {
      let addressId = input.addressId;
      if (addressId) {
        const [owned] = await tx
          .select({ id: addresses.id })
          .from(addresses)
          .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)));
        if (!owned) throw new BadRequestException('Unknown address');
      } else {
        const [a] = await tx
          .insert(addresses)
          .values({ ...input.address!, userId: user.id })
          .returning({ id: addresses.id });
        addressId = a!.id;
      }
      const start = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
      const [row] = await tx
        .insert(amcSubscriptions)
        .values({
          userId: user.id,
          planKey: plan.key,
          addressId,
          pricePaise: plan.pricePaise,
          startsOn: start,
          visits: careVisits(start, plan.visitsPerYear),
        })
        .returning();
      await tx.insert(events).values({
        userId: user.id,
        name: 'care_plan_subscribed',
        properties: { planKey: plan.key },
      });
      return this.present(row!);
    });
  }

  async cancel(user: AuthUser, id: string) {
    const [row] = await this.db
      .update(amcSubscriptions)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(amcSubscriptions.id, id),
          eq(amcSubscriptions.userId, user.id),
          eq(amcSubscriptions.status, 'active'),
        ),
      )
      .returning();
    if (!row) throw new NotFoundException();
    return this.present(row);
  }
}
