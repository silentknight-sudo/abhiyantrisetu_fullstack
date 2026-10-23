import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  assertBalanced,
  isStaff,
  LedgerAccounts,
  type LedgerLine,
  releaseLines,
} from '@setu/domain';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../../common/auth';
import { hmac, safeEqualHex, sha256 } from '../../common/crypto';
import { DomainEvents, type JobTransitionedEvent } from '../../common/events';
import { ENV, type Env } from '../../config/env';
import type { Db, Tx } from '../../db/client';
import { DB } from '../../db/db.module';
import { inboundWebhooks, jobs, ledgerEntries, partners, payments } from '../../db/schema';
import { PAYMENT_GATEWAY, type PaymentGateway } from './razorpay.provider';

/** Jobs a customer can pay for. Closed jobs have already released their held money. */
const PAYABLE_STATES = ['hired', 'scheduled', 'in_progress', 'completed'] as const;

/** Dev/test secret when no Razorpay keys are configured (fake gateway only). */
const FAKE_SECRET = 'fake-razorpay-key-secret';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  private get keySecret() {
    return this.env.RAZORPAY_KEY_SECRET ?? FAKE_SECRET;
  }

  private assertEnabled() {
    if (this.env.PAYMENTS_PROVIDER === 'disabled') {
      throw new ServiceUnavailableException({
        code: 'PAYMENTS_NOT_OPEN',
        message: 'Payments open at launch',
      });
    }
  }

  /** Appends one balanced ledger transaction. */
  private async post(
    tx: Tx,
    kind: string,
    lines: LedgerLine[],
    refs: { jobId?: string; paymentId?: string; memo?: string },
  ) {
    assertBalanced(lines);
    const txnId = randomUUID();
    await tx.insert(ledgerEntries).values(
      lines.map((l) => ({
        txnId,
        kind,
        account: l.account,
        debitPaise: l.debit,
        creditPaise: l.credit,
        jobId: refs.jobId,
        paymentId: refs.paymentId,
        memo: refs.memo,
      })),
    );
    return txnId;
  }

  private async capturedTotal(db: Db | Tx, jobId: string) {
    const [row] = await db
      .select({ n: sql<string>`coalesce(sum(${payments.amountPaise}), 0)` })
      .from(payments)
      .where(and(eq(payments.jobId, jobId), eq(payments.status, 'captured')));
    return Number(row?.n ?? 0);
  }

  /**
   * Opens (or reuses) a Razorpay order for what the customer still owes on the job.
   * Returns what the checkout needs: order id, amount and the public key id.
   */
  async createOrder(user: AuthUser, jobId: string) {
    this.assertEnabled();
    return this.db.transaction(async (tx) => {
      const [job] = await tx.select().from(jobs).where(eq(jobs.id, jobId)).for('update');
      if (!job || job.customerId !== user.id) throw new NotFoundException();
      if (!(PAYABLE_STATES as readonly string[]).includes(job.state)) {
        throw new ConflictException(`A ${job.state} job cannot take payments`);
      }
      const outstanding = job.agreedTotalPaise - (await this.capturedTotal(tx, jobId));
      if (outstanding <= 0)
        throw new ConflictException({ code: 'ALREADY_PAID', message: 'This job is fully paid' });

      const [open] = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.jobId, jobId),
            eq(payments.status, 'created'),
            eq(payments.amountPaise, outstanding),
          ),
        )
        .orderBy(desc(payments.createdAt))
        .limit(1);
      const payment =
        open ??
        (await (async () => {
          const id = randomUUID();
          const order = await this.gateway.createOrder({
            amountPaise: outstanding,
            receipt: id,
            notes: { jobId, paymentId: id },
          });
          const [row] = await tx
            .insert(payments)
            .values({
              id,
              jobId,
              customerId: user.id,
              amountPaise: outstanding,
              razorpayOrderId: order.id,
            })
            .returning();
          return row!;
        })());
      return {
        paymentId: payment.id,
        razorpayOrderId: payment.razorpayOrderId,
        amountPaise: payment.amountPaise,
        currency: 'INR',
        keyId: this.gateway.keyId,
      };
    });
  }

  /** Checkout callback from the app: verifies Razorpay's signature, then records the capture. */
  async verifyCheckout(
    user: AuthUser,
    input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    this.assertEnabled();
    const [p] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, input.razorpayOrderId));
    if (!p || p.customerId !== user.id) throw new NotFoundException();
    const expected = hmac(this.keySecret, `${input.razorpayOrderId}|${input.razorpayPaymentId}`);
    if (
      !/^[0-9a-f]{64}$/.test(input.razorpaySignature) ||
      !safeEqualHex(input.razorpaySignature, expected)
    ) {
      throw new BadRequestException({
        code: 'BAD_SIGNATURE',
        message: 'Payment could not be verified',
      });
    }
    return this.capture(input.razorpayOrderId, input.razorpayPaymentId);
  }

  /**
   * Marks a payment captured and moves the money into the job's held account. Idempotent:
   * the app callback and the webhook both call this, and only the first one posts.
   */
  async capture(orderId: string, paymentId: string, method?: string) {
    const result = await this.db.transaction(async (tx) => {
      const [p] = await tx
        .select()
        .from(payments)
        .where(eq(payments.razorpayOrderId, orderId))
        .for('update');
      if (!p) throw new NotFoundException(`Unknown order ${orderId}`);
      if (p.status === 'captured') return { payment: p, posted: false };
      if (p.status === 'refunded') throw new ConflictException('Payment was refunded');
      const [updated] = await tx
        .update(payments)
        .set({
          status: 'captured',
          razorpayPaymentId: paymentId,
          method,
          capturedAt: new Date(),
          failureReason: null,
        })
        .where(eq(payments.id, p.id))
        .returning();
      await this.post(
        tx,
        'capture',
        [
          { account: LedgerAccounts.gatewayClearing, debit: p.amountPaise, credit: 0 },
          { account: LedgerAccounts.heldForJob(p.jobId), debit: 0, credit: p.amountPaise },
        ],
        { jobId: p.jobId, paymentId: p.id, memo: `Razorpay ${paymentId}` },
      );
      return { payment: updated!, posted: true };
    });
    // A capture that lands after the job closed is released straight away.
    if (result.posted) {
      const [job] = await this.db
        .select({ state: jobs.state })
        .from(jobs)
        .where(eq(jobs.id, result.payment.jobId));
      if (job?.state === 'closed') await this.releaseForJob(result.payment.jobId);
    }
    return result.payment;
  }

  async fail(orderId: string, reason: string) {
    await this.db
      .update(payments)
      .set({ status: 'failed', failureReason: reason.slice(0, 300) })
      .where(and(eq(payments.razorpayOrderId, orderId), eq(payments.status, 'created')));
  }

  /**
   * Releases everything still held for a job to its partner, less the platform fee.
   * Safe to call repeatedly: it only ever moves the current held balance.
   */
  async releaseForJob(jobId: string) {
    return this.db.transaction(async (tx) => {
      const [job] = await tx.select().from(jobs).where(eq(jobs.id, jobId)).for('update');
      if (!job || job.state !== 'closed') return null;
      const account = LedgerAccounts.heldForJob(jobId);
      const [bal] = await tx
        .select({
          n: sql<string>`coalesce(sum(${ledgerEntries.creditPaise} - ${ledgerEntries.debitPaise}), 0)`,
        })
        .from(ledgerEntries)
        .where(eq(ledgerEntries.account, account));
      const held = Number(bal?.n ?? 0);
      if (held <= 0) return null;
      return this.post(
        tx,
        'release',
        releaseLines(jobId, job.partnerId, held, this.env.PLATFORM_FEE_BPS),
        {
          jobId,
          memo: 'Job closed',
        },
      );
    });
  }

  @OnEvent(DomainEvents.JobTransitioned, { promisify: true })
  async onJobTransitioned(e: JobTransitionedEvent) {
    if (e.to !== 'closed') return;
    try {
      await this.releaseForJob(e.jobId);
    } catch (err) {
      this.logger.error(`Release failed for job ${e.jobId}: ${(err as Error).message}`);
    }
  }

  /** Payments and what is still owed, for the job's customer, its partner or staff. */
  async forJob(user: AuthUser, jobId: string) {
    const [job] = await this.db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) throw new NotFoundException();
    const [partner] = await this.db
      .select({ userId: partners.userId })
      .from(partners)
      .where(eq(partners.id, job.partnerId));
    if (job.customerId !== user.id && partner?.userId !== user.id && !isStaff(user.roles))
      throw new NotFoundException();
    const rows = await this.db
      .select({
        id: payments.id,
        amountPaise: payments.amountPaise,
        status: payments.status,
        method: payments.method,
        capturedAt: payments.capturedAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.jobId, jobId))
      .orderBy(desc(payments.createdAt));
    const paid = rows.filter((r) => r.status === 'captured').reduce((s, r) => s + r.amountPaise, 0);
    return {
      agreedTotalPaise: job.agreedTotalPaise,
      paidPaise: paid,
      outstandingPaise: Math.max(0, job.agreedTotalPaise - paid),
      payments: rows,
    };
  }

  /** Razorpay webhook: signature over the raw body, each event handled once. */
  async handleWebhook(rawBody: Buffer | undefined, signature: string, eventId: string | undefined) {
    const secret = this.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException('Razorpay webhook is not configured');
    const raw = rawBody?.toString('utf8') ?? '';
    if (!/^[0-9a-f]{64}$/.test(signature) || !safeEqualHex(signature, hmac(secret, raw))) {
      throw new ForbiddenException('Bad signature');
    }
    const body = JSON.parse(raw) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: { id: string; order_id: string; method?: string; error_description?: string };
        };
      };
    };
    const [fresh] = await this.db
      .insert(inboundWebhooks)
      .values({ provider: 'razorpay', externalId: eventId ?? sha256(raw), payload: body })
      .onConflictDoNothing()
      .returning({ id: inboundWebhooks.id });
    if (!fresh) return { duplicate: true };

    let error: string | null = null;
    try {
      const entity = body.payload?.payment?.entity;
      if (body.event === 'payment.captured' && entity)
        await this.capture(entity.order_id, entity.id, entity.method);
      else if (body.event === 'payment.failed' && entity)
        await this.fail(entity.order_id, entity.error_description ?? 'Payment failed');
    } catch (err) {
      error = (err as Error).message;
      this.logger.error(`Razorpay ${body.event}: ${error}`);
    }
    await this.db
      .update(inboundWebhooks)
      .set({ processedAt: new Date(), error })
      .where(eq(inboundWebhooks.id, fresh.id));
    return { ok: true };
  }

  /** Account balances (credit − debit) and the trial balance, which must be zero. */
  async balances() {
    const rows = await this.db
      .select({
        account: ledgerEntries.account,
        debitPaise: sql<string>`sum(${ledgerEntries.debitPaise})`,
        creditPaise: sql<string>`sum(${ledgerEntries.creditPaise})`,
      })
      .from(ledgerEntries)
      .groupBy(ledgerEntries.account)
      .orderBy(ledgerEntries.account);
    const accounts = rows.map((r) => ({
      account: r.account,
      debitPaise: Number(r.debitPaise),
      creditPaise: Number(r.creditPaise),
      balancePaise: Number(r.creditPaise) - Number(r.debitPaise),
    }));
    return { accounts, trialBalancePaise: accounts.reduce((s, a) => s + a.balancePaise, 0) };
  }
}
