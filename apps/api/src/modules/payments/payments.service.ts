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
  formatINR,
  isStaff,
  LedgerAccounts,
  type LedgerLine,
  releaseLines,
} from '@setu/domain';
import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../../common/auth';
import { hmac, safeEqualHex, sha256 } from '../../common/crypto';
import { DomainEvents, type JobTransitionedEvent } from '../../common/events';
import { ENV, type Env } from '../../config/env';
import type { Db, Tx } from '../../db/client';
import { DB } from '../../db/db.module';
import {
  auditLog,
  inboundWebhooks,
  jobs,
  ledgerEntries,
  partners,
  payments,
  refunds,
  requirements,
  users,
} from '../../db/schema';
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
        currency: 'INR' as const,
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
   * Development checkout for the fake gateway: completes the order as if the customer
   * paid. Not routable unless PAYMENTS_PROVIDER=fake, which production refuses.
   */
  async completeFakeCheckout(user: AuthUser, razorpayOrderId: string) {
    if (this.env.PAYMENTS_PROVIDER !== 'fake') throw new NotFoundException();
    const razorpayPaymentId = `pay_fake_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    return this.verifyCheckout(user, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: hmac(this.keySecret, `${razorpayOrderId}|${razorpayPaymentId}`),
    });
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
      if (job?.state === 'cancelled') {
        await this.refundForJob(result.payment.jobId, 'Paid after the job was cancelled');
      }
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
    try {
      if (e.to === 'closed') await this.releaseForJob(e.jobId);
      if (e.to === 'cancelled') {
        await this.refundForJob(
          e.jobId,
          e.from === 'disputed' ? 'Dispute resolved as a refund' : 'Job cancelled',
        );
      }
    } catch (err) {
      this.logger.error(`Settling job ${e.jobId} (${e.to}) failed: ${(err as Error).message}`);
    }
  }

  // ---------- refunds ----------

  /**
   * Refunds every captured payment of a cancelled job, once each. The intent is recorded
   * first (so a crash or a gateway error leaves a visible row to retry), then sent.
   */
  async refundForJob(jobId: string, reason: string) {
    const created = await this.db.transaction(async (tx) => {
      const [job] = await tx.select().from(jobs).where(eq(jobs.id, jobId)).for('update');
      if (!job || job.state !== 'cancelled') return [];
      const captured = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.jobId, jobId), eq(payments.status, 'captured')));
      if (captured.length === 0) return [];
      return tx
        .insert(refunds)
        .values(
          captured.map((p) => ({ paymentId: p.id, jobId, amountPaise: p.amountPaise, reason })),
        )
        .onConflictDoNothing({ target: refunds.paymentId })
        .returning({ id: refunds.id });
    });
    for (const r of created) await this.sendRefund(r.id);
    return created.length;
  }

  /**
   * Sends one refund to Razorpay. The row is claimed (`sending`) under a lock first, so two
   * retries can never refund twice; success moves the money out of the job's held account.
   */
  async sendRefund(refundId: string) {
    const claim = await this.db.transaction(async (tx) => {
      const [r] = await tx.select().from(refunds).where(eq(refunds.id, refundId)).for('update');
      if (!r || !['requested', 'failed'].includes(r.status)) return null;
      const [p] = await tx.select().from(payments).where(eq(payments.id, r.paymentId));
      await tx
        .update(refunds)
        .set({ status: 'sending', attempts: r.attempts + 1 })
        .where(eq(refunds.id, r.id));
      return { refund: r, razorpayPaymentId: p?.razorpayPaymentId ?? null };
    });
    if (!claim) return null;
    const { refund } = claim;
    let result: { id: string; status: 'pending' | 'processed' };
    try {
      if (!claim.razorpayPaymentId) throw new Error('Payment has no Razorpay payment id');
      result = await this.gateway.refund({
        razorpayPaymentId: claim.razorpayPaymentId,
        amountPaise: refund.amountPaise,
        receipt: refund.id,
        notes: { jobId: refund.jobId, refundId: refund.id },
      });
    } catch (err) {
      const message = (err as Error).message.slice(0, 300);
      this.logger.error(`Refund ${refund.id} failed: ${message}`);
      await this.db
        .update(refunds)
        .set({ status: 'failed', failureReason: message })
        .where(eq(refunds.id, refund.id));
      return 'failed' as const;
    }
    await this.db.transaction(async (tx) => {
      await tx
        .update(refunds)
        .set({
          status: result.status === 'processed' ? 'processed' : 'initiated',
          razorpayRefundId: result.id,
          failureReason: null,
        })
        .where(eq(refunds.id, refund.id));
      await tx
        .update(payments)
        .set({ status: 'refunded' })
        .where(eq(payments.id, refund.paymentId));
      await this.post(
        tx,
        'refund',
        [
          {
            account: LedgerAccounts.heldForJob(refund.jobId),
            debit: refund.amountPaise,
            credit: 0,
          },
          { account: LedgerAccounts.gatewayClearing, debit: 0, credit: refund.amountPaise },
        ],
        { jobId: refund.jobId, paymentId: refund.paymentId, memo: `Refund ${result.id}` },
      );
    });
    return result.status === 'processed' ? ('processed' as const) : ('initiated' as const);
  }

  /** Razorpay's later word on a refund: reached the customer, or bounced back to us. */
  private async settleRefund(
    razorpayRefundId: string,
    outcome: 'processed' | 'failed',
    why?: string,
  ) {
    await this.db.transaction(async (tx) => {
      const [r] = await tx
        .select()
        .from(refunds)
        .where(eq(refunds.razorpayRefundId, razorpayRefundId))
        .for('update');
      if (!r || r.status === outcome || !['initiated', 'processed'].includes(r.status)) return;
      if (outcome === 'processed') {
        await tx.update(refunds).set({ status: 'processed' }).where(eq(refunds.id, r.id));
        return;
      }
      // The money came back: hold it on the job again and leave the refund to retry.
      await tx
        .update(refunds)
        .set({
          status: 'failed',
          failureReason: (why ?? 'Refund failed at the bank').slice(0, 300),
        })
        .where(eq(refunds.id, r.id));
      await tx.update(payments).set({ status: 'captured' }).where(eq(payments.id, r.paymentId));
      await this.post(
        tx,
        'refund_reversal',
        [
          { account: LedgerAccounts.gatewayClearing, debit: r.amountPaise, credit: 0 },
          { account: LedgerAccounts.heldForJob(r.jobId), debit: 0, credit: r.amountPaise },
        ],
        { jobId: r.jobId, paymentId: r.paymentId, memo: `Refund ${razorpayRefundId} failed` },
      );
    });
  }

  /** Recent refunds for the admin, failures first; or one refund by id. */
  async refundsList(id?: string) {
    const customer = users;
    const rows = await this.db
      .select({
        refund: refunds,
        title: requirements.title,
        customerPhone: customer.phone,
        customerName: customer.name,
      })
      .from(refunds)
      .innerJoin(jobs, eq(jobs.id, refunds.jobId))
      .innerJoin(requirements, eq(requirements.id, jobs.requirementId))
      .innerJoin(customer, eq(customer.id, jobs.customerId))
      .where(id ? eq(refunds.id, id) : undefined)
      .orderBy(sql`${refunds.status} = 'failed' desc`, desc(refunds.createdAt))
      .limit(200);
    return rows.map(({ refund, ...rest }) => ({ ...refund, ...rest }));
  }

  /** Staff retry of a failed refund (or one stuck before it reached Razorpay). */
  async retryRefund(staff: AuthUser, refundId: string, ip?: string) {
    const [r] = await this.db.select().from(refunds).where(eq(refunds.id, refundId));
    if (!r) throw new NotFoundException();
    if (!['requested', 'failed'].includes(r.status)) {
      throw new ConflictException({ code: 'NOT_RETRYABLE', message: `This refund is ${r.status}` });
    }
    const outcome = await this.sendRefund(refundId);
    await this.db.insert(auditLog).values({
      actorId: staff.id,
      action: 'refund.retried',
      entityType: 'refund',
      entityId: refundId,
      before: { status: r.status, failureReason: r.failureReason },
      after: { outcome },
      ip,
    });
    const [after] = await this.refundsList(refundId);
    return after!;
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
    const sum = (status: string[]) =>
      rows.filter((r) => status.includes(r.status)).reduce((s, r) => s + r.amountPaise, 0);
    const paid = sum(['captured', 'refunded']);
    const refunded = sum(['refunded']);
    return {
      agreedTotalPaise: job.agreedTotalPaise,
      paidPaise: paid,
      refundedPaise: refunded,
      outstandingPaise: job.state === 'cancelled' ? 0 : Math.max(0, job.agreedTotalPaise - paid),
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
        refund?: { entity?: { id: string; error_description?: string } };
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
      const refund = body.payload?.refund?.entity;
      if (body.event === 'refund.processed' && refund)
        await this.settleRefund(refund.id, 'processed');
      else if (body.event === 'refund.failed' && refund)
        await this.settleRefund(refund.id, 'failed', refund.error_description);
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

  private async owed(db: Db | Tx, partnerId: string) {
    const [row] = await db
      .select({
        n: sql<string>`coalesce(sum(${ledgerEntries.creditPaise} - ${ledgerEntries.debitPaise}), 0)`,
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.account, LedgerAccounts.partnerPayable(partnerId)));
    return Number(row?.n ?? 0);
  }

  /** Partners with released money not yet paid out, most owed first. */
  async payoutsDue() {
    const rows = await this.db
      .select({
        account: ledgerEntries.account,
        owed: sql<string>`sum(${ledgerEntries.creditPaise} - ${ledgerEntries.debitPaise})`,
      })
      .from(ledgerEntries)
      .where(like(ledgerEntries.account, 'partner_payable:%'))
      .groupBy(ledgerEntries.account);
    const due = rows
      .map((r) => ({
        partnerId: r.account.slice('partner_payable:'.length),
        owedPaise: Number(r.owed),
      }))
      .filter((r) => r.owedPaise > 0);
    if (due.length === 0) return [];
    const people = await this.db
      .select({ id: partners.id, displayName: partners.displayName, phone: users.phone })
      .from(partners)
      .innerJoin(users, eq(users.id, partners.userId))
      .where(
        inArray(
          partners.id,
          due.map((d) => d.partnerId),
        ),
      );
    return due
      .map((d) => {
        const p = people.find((x) => x.id === d.partnerId);
        return { ...d, displayName: p?.displayName ?? 'Unknown partner', phone: p?.phone ?? '' };
      })
      .sort((a, b) => b.owedPaise - a.owedPaise);
  }

  /**
   * Records a payout made outside Setu (bank transfer, UPI) until RazorpayX payouts land:
   * moves it out of what the partner is owed, never more than that, with an audit entry.
   */
  async recordPayout(
    staff: AuthUser,
    input: { partnerId: string; amountPaise: number; reference: string },
    ip?: string,
  ) {
    return this.db.transaction(async (tx) => {
      // One payout per partner at a time, so two clicks cannot pay twice.
      const [partner] = await tx
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.id, input.partnerId))
        .for('update');
      if (!partner) throw new NotFoundException();
      const owed = await this.owed(tx, input.partnerId);
      if (input.amountPaise > owed) {
        throw new ConflictException({
          code: 'MORE_THAN_OWED',
          message: `Only ${formatINR(owed)} is owed to this partner`,
        });
      }
      const txnId = await this.post(
        tx,
        'payout',
        [
          {
            account: LedgerAccounts.partnerPayable(input.partnerId),
            debit: input.amountPaise,
            credit: 0,
          },
          { account: LedgerAccounts.gatewayClearing, debit: 0, credit: input.amountPaise },
        ],
        { memo: `Payout ${input.reference}` },
      );
      await tx.insert(auditLog).values({
        actorId: staff.id,
        action: 'payout.recorded',
        entityType: 'partner',
        entityId: input.partnerId,
        before: { owedPaise: owed },
        after: {
          owedPaise: owed - input.amountPaise,
          amountPaise: input.amountPaise,
          reference: input.reference,
          txnId,
        },
        ip,
      });
      return {
        partnerId: input.partnerId,
        paidPaise: input.amountPaise,
        owedPaise: owed - input.amountPaise,
      };
    });
  }
}
