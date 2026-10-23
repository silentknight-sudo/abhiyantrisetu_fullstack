import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Actor,
  AUTO_CONFIRM_AFTER_MS,
  isStaff,
  type JobEvent,
  jobMachine,
  type JobState,
  type TransitionResult,
} from '@setu/domain';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, desc, eq, lte, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../../common/auth';
import { DomainEvents, type JobTransitionedEvent } from '../../common/events';
import { hmac, numericCode, safeEqualHex } from '../../common/crypto';
import { assertTransition } from '../../common/transition-error';
import { ENV, type Env } from '../../config/env';
import type { Db, Tx } from '../../db/client';
import { DB } from '../../db/db.module';
import { addresses, jobEvents, jobs, partners, requirements, users } from '../../db/schema';
import { RequirementsService } from '../requirements/requirements.service';

type JobRow = typeof jobs.$inferSelect;

export const MAX_START_CODE_ATTEMPTS = 5;

/** Column stamped when a job enters each state. */
const STATE_TIMESTAMP: Partial<Record<JobState, keyof JobRow>> = {
  in_progress: 'startedAt',
  completed: 'completedAt',
  closed: 'closedAt',
  cancelled: 'cancelledAt',
  disputed: 'disputedAt',
};

/** Builds the domain event once the locked job row is known (the start-code check needs it). */
type EventBuilder = (job: JobRow, tx: Tx) => Promise<JobEvent>;

/**
 * The only place a job changes state. Every transition locks the row, runs the guarded
 * transition table from @setu/domain and appends a job_events row in the same transaction.
 */
export interface JobContact {
  name: string | null;
  phone: string;
  address: {
    line1: string;
    line2: string | null;
    tower: string | null;
    flat: string | null;
    sector: string | null;
    city: string;
    pincode: string;
    location: { lat: number; lng: number };
  } | null;
}

@Injectable()
export class JobsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
    @Inject(RequirementsService) private readonly requirements: RequirementsService,
    @Inject(EventEmitter2) private readonly bus: EventEmitter2,
  ) {}

  private hashStartCode(jobId: string, code: string) {
    return hmac(this.env.OTP_HASH_SECRET, `start:${jobId}:${code}`);
  }

  /**
   * The hire event: moves the requirement quoted → hired and creates the job. Returns the
   * plaintext start code once; only its hash is stored.
   */
  async hire(
    tx: Tx,
    input: {
      requirementId: string;
      quoteId?: string;
      partnerId: string;
      agreedTotalPaise: number;
      actor: { type: 'customer' | 'ops'; id: string };
    },
  ) {
    const req = await this.requirements.transition(
      tx,
      input.requirementId,
      { type: 'hire' },
      input.actor,
    );
    const [partner] = await tx
      .select({ userId: partners.userId })
      .from(partners)
      .where(eq(partners.id, input.partnerId));
    if (!partner) throw new BadRequestException('Unknown partner');
    if (partner.userId === req.customerId) {
      throw new BadRequestException('A partner cannot be hired on their own requirement');
    }

    const jobId = randomUUID();
    const startCode = numericCode(4);
    const [job] = await tx
      .insert(jobs)
      .values({
        id: jobId,
        requirementId: req.id,
        quoteId: input.quoteId,
        customerId: req.customerId,
        partnerId: input.partnerId,
        agreedTotalPaise: input.agreedTotalPaise,
        startCodeHash: this.hashStartCode(jobId, startCode),
      })
      .returning();
    await tx.insert(jobEvents).values({
      jobId: job!.id,
      event: 'hire',
      fromState: null,
      toState: 'hired',
      actorType: input.actor.type,
      actorId: input.actor.id,
      payload: { quoteId: input.quoteId ?? null, agreedTotalPaise: input.agreedTotalPaise },
    });
    return { job: { ...job!, startCodeHash: undefined }, startCode };
  }

  /** Works out how `user` relates to `job`; 404 when unrelated so ids cannot be probed. */
  private async actorFor(db: Db | Tx, user: AuthUser, job: JobRow): Promise<Actor> {
    const [partner] = await db
      .select({ userId: partners.userId })
      .from(partners)
      .where(eq(partners.id, job.partnerId));
    if (partner?.userId === user.id) return 'partner';
    if (job.customerId === user.id) return 'customer';
    if (isStaff(user.roles)) return 'ops';
    throw new NotFoundException();
  }

  private present(job: JobRow, actor: Actor, extra: { title: string; contact: JobContact | null }) {
    const { startCodeHash: _hash, startCodeAttempts: _attempts, ...rest } = job;
    return {
      ...rest,
      ...extra,
      viewerRole: actor,
      availableActions: jobMachine.availableEvents(job.state, actor),
    };
  }

  /**
   * The job's title, and who to call once hired: the partner (and staff) get the customer
   * and the site address, the customer gets the partner. Hidden on cancelled jobs.
   */
  private async details(db: Db | Tx, job: JobRow, actor: Actor) {
    const [site] = await db
      .select({
        title: requirements.title,
        customerName: users.name,
        customerPhone: users.phone,
        address: {
          line1: addresses.line1,
          line2: addresses.line2,
          tower: addresses.tower,
          flat: addresses.flat,
          sector: addresses.sector,
          city: addresses.city,
          pincode: addresses.pincode,
          location: addresses.location,
        },
      })
      .from(requirements)
      .innerJoin(users, eq(users.id, requirements.customerId))
      .innerJoin(addresses, eq(addresses.id, requirements.addressId))
      .where(eq(requirements.id, job.requirementId));
    if (!site) throw new NotFoundException();
    let contact: JobContact | null = null;
    if (job.state !== 'cancelled') {
      if (actor === 'customer') {
        const [p] = await db
          .select({ name: partners.displayName, phone: users.phone })
          .from(partners)
          .innerJoin(users, eq(users.id, partners.userId))
          .where(eq(partners.id, job.partnerId));
        contact = p ? { ...p, address: null } : null;
      } else {
        contact = { name: site.customerName, phone: site.customerPhone, address: site.address };
      }
    }
    return { title: site.title, contact };
  }

  async get(user: AuthUser, id: string) {
    const [job] = await this.db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) throw new NotFoundException();
    const actor = await this.actorFor(this.db, user, job);
    return this.present(job, actor, await this.details(this.db, job, actor));
  }

  async listMine(user: AuthUser) {
    const [p] = await this.db
      .select({ id: partners.id })
      .from(partners)
      .where(eq(partners.userId, user.id));
    const rows = await this.db
      .select({ job: jobs, title: requirements.title })
      .from(jobs)
      .innerJoin(requirements, eq(requirements.id, jobs.requirementId))
      .where(
        p
          ? or(eq(jobs.customerId, user.id), eq(jobs.partnerId, p.id))
          : eq(jobs.customerId, user.id),
      )
      .orderBy(desc(jobs.createdAt))
      .limit(100);
    return rows.map(({ job, title }) =>
      this.present(job, p && job.partnerId === p.id ? 'partner' : 'customer', {
        title,
        contact: null,
      }),
    );
  }

  async history(user: AuthUser, id: string) {
    await this.get(user, id);
    return this.db
      .select()
      .from(jobEvents)
      .where(eq(jobEvents.jobId, id))
      .orderBy(jobEvents.createdAt, jobEvents.id);
  }

  /**
   * Generic transition. `user === 'system'` is used by workers. Errors that must not roll
   * back side effects (start-code attempt counter) are thrown after commit.
   */
  async transition(id: string, user: AuthUser | 'system', build: EventBuilder) {
    const outcome = await this.db.transaction(async (tx) => {
      const [job] = await tx.select().from(jobs).where(eq(jobs.id, id)).for('update');
      if (!job) throw new NotFoundException();
      const actor: Actor = user === 'system' ? 'system' : await this.actorFor(tx, user, job);

      const event = await build(job, tx);
      const res: TransitionResult<JobState> = jobMachine.transition(job.state, event, actor);
      if (!res.ok) return { res } as const;
      const eventType = event.type;

      const stamp = STATE_TIMESTAMP[res.to];
      const set: Partial<JobRow> = { state: res.to };
      if (stamp) (set as Record<string, unknown>)[stamp] = new Date();
      if (event.type === 'schedule' || event.type === 'reschedule') set.slotStart = event.slotStart;

      const [updated] = await tx.update(jobs).set(set).where(eq(jobs.id, id)).returning();
      await tx.insert(jobEvents).values({
        jobId: id,
        event: event.type,
        fromState: res.from,
        toState: res.to,
        actorType: actor,
        actorId: user === 'system' ? null : user.id,
        payload: event,
      });
      return { res, actor, row: updated!, event: eventType } as const;
    });
    assertTransition(outcome.res);
    const row = outcome.row!;
    const event: JobTransitionedEvent = {
      jobId: id,
      event: outcome.event!,
      from: outcome.res.from,
      to: outcome.res.to,
      customerId: row.customerId,
      partnerId: row.partnerId,
      actorUserId: user === 'system' ? null : user.id,
    };
    await this.bus.emitAsync(DomainEvents.JobTransitioned, event).catch(() => undefined);
    return this.present(row, outcome.actor!, await this.details(this.db, row, outcome.actor!));
  }

  schedule(user: AuthUser, id: string, slotStart: Date) {
    return this.transition(id, user, async () => ({
      type: 'schedule',
      slotStart,
      now: new Date(),
    }));
  }

  reschedule(user: AuthUser, id: string, slotStart: Date) {
    return this.transition(id, user, async () => ({
      type: 'reschedule',
      slotStart,
      now: new Date(),
    }));
  }

  start(user: AuthUser, id: string, startCode: string) {
    return this.transition(id, user, async (job, tx) => {
      if (job.startCodeAttempts >= MAX_START_CODE_ATTEMPTS) {
        throw new HttpException(
          {
            code: 'START_CODE_LOCKED',
            message: 'Too many wrong codes. Ask the customer to generate a new start code.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const valid = safeEqualHex(job.startCodeHash, this.hashStartCode(job.id, startCode));
      if (!valid && job.state === 'scheduled') {
        // Persisted even though the transition is rejected (the tx still commits).
        await tx
          .update(jobs)
          .set({ startCodeAttempts: job.startCodeAttempts + 1 })
          .where(eq(jobs.id, job.id));
      }
      return { type: 'start', startCodeValid: valid };
    });
  }

  complete(user: AuthUser, id: string) {
    return this.transition(id, user, async () => ({ type: 'complete' }));
  }

  confirm(user: AuthUser, id: string) {
    return this.transition(id, user, async () => ({ type: 'confirm' }));
  }

  cancel(user: AuthUser, id: string, reason: string) {
    return this.transition(id, user, async () => ({ type: 'cancel', reason }));
  }

  dispute(user: AuthUser, id: string, reason: string) {
    return this.transition(id, user, async () => ({ type: 'dispute', reason }));
  }

  resolve(user: AuthUser, id: string, outcome: 'release' | 'refund', note: string) {
    return this.transition(id, user, async () => ({
      type: outcome === 'release' ? 'resolve_release' : 'resolve_refund',
      note,
    }));
  }

  /** Customer-only: issues a fresh start code (codes are hashed, so they cannot be re-shown). */
  async regenerateStartCode(user: AuthUser, id: string) {
    const [job] = await this.db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) throw new NotFoundException();
    if ((await this.actorFor(this.db, user, job)) !== 'customer') throw new NotFoundException();
    if (!['hired', 'scheduled'].includes(job.state)) {
      throw new BadRequestException('Start code is only needed before work begins');
    }
    const startCode = numericCode(4);
    await this.db
      .update(jobs)
      .set({ startCodeHash: this.hashStartCode(job.id, startCode), startCodeAttempts: 0 })
      .where(eq(jobs.id, job.id));
    return { startCode };
  }

  /** Worker sweep: closes jobs whose 48-hour confirmation window has elapsed. */
  async autoConfirmDue(now = new Date()): Promise<string[]> {
    const due = await this.db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.state, 'completed'),
          lte(jobs.completedAt, new Date(now.getTime() - AUTO_CONFIRM_AFTER_MS)),
        ),
      )
      .limit(500);
    const closed: string[] = [];
    for (const { id } of due) {
      try {
        await this.transition(id, 'system', async (job) => ({
          type: 'auto_confirm',
          completedAt: job.completedAt!,
          now,
        }));
        closed.push(id);
      } catch {
        // Raced with a customer confirm or dispute; the next sweep re-evaluates.
      }
    }
    return closed;
  }
}
