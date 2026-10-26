import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isStaff, quoteTotals, roundPaise } from '@setu/domain';
import type { CreateQuoteInput, ReviseQuoteInput } from '@setu/schemas';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import { DomainEvents, type JobHiredEvent, type QuoteSentEvent } from '../../common/events';
import type { Db, Tx } from '../../db/client';
import { DB } from '../../db/db.module';
import {
  addresses,
  events,
  leads,
  partners,
  quoteItems,
  quoteRevisions,
  quotes,
  requirements,
} from '../../db/schema';
import { JobsService } from '../jobs/jobs.service';
import { PartnersService } from '../partners/partners.service';
import { RequirementsService } from '../requirements/requirements.service';
import { StorageService } from '../storage/storage.service';

type QuoteRow = typeof quotes.$inferSelect;

const DAY_MS = 86_400_000;

/** Quantities are numeric(12,3) in Postgres, so the driver returns strings. */
const lineOut = (i: typeof quoteItems.$inferSelect) => ({ ...i, quantity: Number(i.quantity) });

/** Line items and totals for a quote body, computed with the shared GST rules. */
function price(input: CreateQuoteInput | ReviseQuoteInput) {
  const items = input.items.map((i, idx) => ({
    description: i.description,
    quantity: i.quantity,
    unit: i.unit,
    unitPricePaise: i.unitPricePaise,
    amountPaise: roundPaise(i.quantity * i.unitPricePaise),
    sortOrder: idx,
  }));
  const totals = quoteTotals(
    items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPricePaise,
    })),
    input.gst ? { rate: input.gst.rate, interState: input.gst.interState } : null,
  );
  return { items, totals };
}

/**
 * Leads (partner side) and quotes. Accepting a quote is the hire: it hands over to
 * JobsService.hire inside the same transaction.
 */
@Injectable()
export class QuotesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PartnersService) private readonly partners: PartnersService,
    @Inject(RequirementsService) private readonly requirements: RequirementsService,
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(EventEmitter2) private readonly bus: EventEmitter2,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  /** Fires after commit; listener failures never undo the action. */
  private emit(name: string, payload: unknown) {
    return this.bus.emitAsync(name, payload).catch(() => undefined);
  }

  // ---------- partner: leads ----------

  /**
   * The partner's lead inbox. Shows the job, sector and distance but never the customer's
   * name, phone or exact address; those are shared after hire.
   */
  async myLeads(user: AuthUser) {
    const me = await this.partners.requireMine(user);
    const rows = await this.db
      .select({
        id: leads.id,
        status: leads.status,
        sentAt: leads.sentAt,
        seenAt: leads.seenAt,
        requirement: {
          id: requirements.id,
          type: requirements.type,
          title: requirements.title,
          details: requirements.details,
          status: requirements.status,
          budgetMinPaise: requirements.budgetMinPaise,
          budgetMaxPaise: requirements.budgetMaxPaise,
          createdAt: requirements.createdAt,
        },
        area: { sector: addresses.sector, city: addresses.city, pincode: addresses.pincode },
        distanceKm:
          sql<number>`round((ST_Distance(${partners.baseLocation}, ${addresses.location}) / 1000.0)::numeric, 1)`.mapWith(
            Number,
          ),
        quoteId: quotes.id,
      })
      .from(leads)
      .innerJoin(requirements, eq(requirements.id, leads.requirementId))
      .innerJoin(addresses, eq(addresses.id, requirements.addressId))
      .innerJoin(partners, eq(partners.id, leads.partnerId))
      .leftJoin(quotes, eq(quotes.leadId, leads.id))
      .where(eq(leads.partnerId, me.id))
      .orderBy(desc(leads.sentAt))
      .limit(100);
    return rows.map((l) => ({
      ...l,
      requirement: {
        ...l.requirement,
        photoUrls: this.storage.viewUrls(l.requirement.details.photos as unknown[] | undefined),
      },
    }));
  }

  private async lockMyLead(tx: Tx, user: AuthUser, leadId: string) {
    const me = await this.partners.requireMine(user, tx);
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for('update');
    if (!lead || lead.partnerId !== me.id) throw new NotFoundException();
    return { me, lead };
  }

  async markSeen(user: AuthUser, leadId: string) {
    return this.db.transaction(async (tx) => {
      const { lead } = await this.lockMyLead(tx, user, leadId);
      if (lead.status !== 'sent') return lead;
      const [updated] = await tx
        .update(leads)
        .set({ status: 'seen', seenAt: new Date() })
        .where(eq(leads.id, leadId))
        .returning();
      return updated!;
    });
  }

  async decline(user: AuthUser, leadId: string) {
    return this.db.transaction(async (tx) => {
      const { lead } = await this.lockMyLead(tx, user, leadId);
      if (lead.status === 'quoted') throw new ConflictException('Withdraw your quote instead');
      const [updated] = await tx
        .update(leads)
        .set({ status: 'declined', respondedAt: new Date() })
        .where(eq(leads.id, leadId))
        .returning();
      return updated!;
    });
  }

  // ---------- partner: quotes ----------

  async createQuote(user: AuthUser, leadId: string, input: CreateQuoteInput) {
    const created = await this.db.transaction(async (tx) => {
      const { me, lead } = await this.lockMyLead(tx, user, leadId);
      if (lead.status === 'declined' || lead.status === 'expired') {
        throw new ConflictException('This lead is closed');
      }
      const [existing] = await tx
        .select({ id: quotes.id })
        .from(quotes)
        .where(eq(quotes.leadId, leadId));
      if (existing) throw new ConflictException('You already quoted; send a revision instead');

      const [req] = await tx
        .select({ status: requirements.status })
        .from(requirements)
        .where(eq(requirements.id, lead.requirementId));
      if (!req || !['matched', 'quoted'].includes(req.status)) {
        throw new ConflictException('This requirement is no longer taking quotes');
      }

      const { items, totals } = price(input);
      const now = new Date();
      const [quote] = await tx
        .insert(quotes)
        .values({
          leadId,
          requirementId: lead.requirementId,
          partnerId: me.id,
          status: 'sent',
          version: 1,
          subtotalPaise: totals.subtotal,
          gstRate: input.gst?.rate ?? null,
          interState: input.gst?.interState ?? false,
          gstPaise: totals.gst?.totalTax ?? 0,
          totalPaise: totals.total,
          milestones: input.milestones ?? null,
          notes: input.notes,
          validUntil: new Date(now.getTime() + input.validDays * DAY_MS),
          sentAt: now,
        })
        .returning();
      const lines = await tx
        .insert(quoteItems)
        .values(items.map((i) => ({ ...i, quoteId: quote!.id, quantity: String(i.quantity) })))
        .returning();
      await tx.insert(quoteRevisions).values({
        quoteId: quote!.id,
        version: 1,
        snapshot: {
          items,
          totals,
          milestones: input.milestones ?? null,
          notes: input.notes ?? null,
        },
        authorId: user.id,
      });
      await tx
        .update(leads)
        .set({ status: 'quoted', respondedAt: now, seenAt: lead.seenAt ?? now })
        .where(eq(leads.id, leadId));
      await this.requirements.transition(
        tx,
        lead.requirementId,
        { type: 'receive_quote' },
        { type: 'system' },
      );
      await tx.insert(events).values({
        userId: user.id,
        name: 'quote_sent',
        properties: {
          quoteId: quote!.id,
          requirementId: lead.requirementId,
          totalPaise: totals.total,
        },
      });
      return { ...quote!, items: lines.map(lineOut) };
    });
    const event: QuoteSentEvent = {
      quoteId: created.id,
      requirementId: created.requirementId,
      partnerId: created.partnerId,
      totalPaise: created.totalPaise,
    };
    await this.emit(DomainEvents.QuoteSent, event);
    return created;
  }

  private async lockQuote(tx: Tx, quoteId: string) {
    const [q] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).for('update');
    if (!q) throw new NotFoundException();
    return q;
  }

  private async lockMyQuote(tx: Tx, user: AuthUser, quoteId: string) {
    const me = await this.partners.requireMine(user, tx);
    const q = await this.lockQuote(tx, quoteId);
    if (q.partnerId !== me.id) throw new NotFoundException();
    return q;
  }

  async revise(user: AuthUser, quoteId: string, input: ReviseQuoteInput) {
    const revised = await this.db.transaction(async (tx) => {
      const q = await this.lockMyQuote(tx, user, quoteId);
      if (q.status !== 'sent') throw new ConflictException(`A ${q.status} quote cannot be revised`);
      const { items, totals } = price(input);
      const version = q.version + 1;
      const [updated] = await tx
        .update(quotes)
        .set({
          version,
          subtotalPaise: totals.subtotal,
          gstRate: input.gst?.rate ?? null,
          interState: input.gst?.interState ?? false,
          gstPaise: totals.gst?.totalTax ?? 0,
          totalPaise: totals.total,
          milestones: input.milestones ?? null,
          notes: input.notes,
          validUntil: new Date(Date.now() + input.validDays * DAY_MS),
          sentAt: new Date(),
        })
        .where(eq(quotes.id, quoteId))
        .returning();
      await tx.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
      const lines = await tx
        .insert(quoteItems)
        .values(items.map((i) => ({ ...i, quoteId, quantity: String(i.quantity) })))
        .returning();
      await tx.insert(quoteRevisions).values({
        quoteId,
        version,
        snapshot: {
          items,
          totals,
          milestones: input.milestones ?? null,
          notes: input.notes ?? null,
        },
        authorId: user.id,
        message: input.message,
      });
      return { ...updated!, items: lines.map(lineOut) };
    });
    // The customer hears about a revised price the same way as a new quote.
    const event: QuoteSentEvent = {
      quoteId: revised.id,
      requirementId: revised.requirementId,
      partnerId: revised.partnerId,
      totalPaise: revised.totalPaise,
    };
    await this.emit(DomainEvents.QuoteRevised, event);
    return revised;
  }

  async withdraw(user: AuthUser, quoteId: string) {
    return this.db.transaction(async (tx) => {
      const q = await this.lockMyQuote(tx, user, quoteId);
      if (q.status !== 'sent')
        throw new ConflictException(`A ${q.status} quote cannot be withdrawn`);
      const [updated] = await tx
        .update(quotes)
        .set({ status: 'withdrawn' })
        .where(eq(quotes.id, quoteId))
        .returning();
      return updated!;
    });
  }

  // ---------- both sides ----------

  /** Full quote with line items and the negotiation thread, for its partner or customer. */
  async getQuote(user: AuthUser, quoteId: string) {
    const [q] = await this.db.select().from(quotes).where(eq(quotes.id, quoteId));
    if (!q) throw new NotFoundException();
    const [req] = await this.db
      .select({ customerId: requirements.customerId })
      .from(requirements)
      .where(eq(requirements.id, q.requirementId));
    const mine = await this.partners.findByUser(user.id);
    const allowed = req?.customerId === user.id || mine?.id === q.partnerId || isStaff(user.roles);
    if (!allowed) throw new NotFoundException();
    return this.withDetails([q]).then((r) => r[0]!);
  }

  private async withDetails(rows: QuoteRow[]) {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [items, revisions, cards] = await Promise.all([
      this.db
        .select()
        .from(quoteItems)
        .where(inArray(quoteItems.quoteId, ids))
        .orderBy(asc(quoteItems.sortOrder)),
      this.db
        .select({
          quoteId: quoteRevisions.quoteId,
          version: quoteRevisions.version,
          message: quoteRevisions.message,
          authorId: quoteRevisions.authorId,
          createdAt: quoteRevisions.createdAt,
        })
        .from(quoteRevisions)
        .where(inArray(quoteRevisions.quoteId, ids))
        .orderBy(asc(quoteRevisions.createdAt)),
      // Public partner card only: no phone or exact location before hire.
      this.db
        .select({
          id: partners.id,
          displayName: partners.displayName,
          businessName: partners.businessName,
          trades: partners.trades,
          tier: partners.tier,
          verificationStatus: partners.verificationStatus,
          ratingAvg: partners.ratingAvg,
          ratingCount: partners.ratingCount,
          avgResponseMinutes: partners.avgResponseMinutes,
          gstRegistered: sql<boolean>`${partners.gstin} IS NOT NULL`,
        })
        .from(partners)
        .where(
          inArray(
            partners.id,
            rows.map((r) => r.partnerId),
          ),
        ),
    ]);
    return rows.map((q) => ({
      ...q,
      items: items.filter((i) => i.quoteId === q.id).map(lineOut),
      thread: revisions.filter((r) => r.quoteId === q.id),
      partner: cards.find((c) => c.id === q.partnerId) ?? null,
    }));
  }

  // ---------- customer ----------

  /** Quotes on one of the customer's requirements, cheapest first. */
  async forRequirement(user: AuthUser, requirementId: string) {
    await this.requirements.get(user, requirementId); // 404 unless owner or staff
    const rows = await this.db
      .select()
      .from(quotes)
      .where(and(eq(quotes.requirementId, requirementId), ne(quotes.status, 'draft')))
      .orderBy(asc(quotes.totalPaise));
    return this.withDetails(rows);
  }

  private async lockCustomerQuote(tx: Tx, user: AuthUser, quoteId: string) {
    const q = await this.lockQuote(tx, quoteId);
    const [req] = await tx
      .select({ customerId: requirements.customerId })
      .from(requirements)
      .where(eq(requirements.id, q.requirementId));
    if (req?.customerId !== user.id) throw new NotFoundException();
    return q;
  }

  /** Customer counter-offer or question; appears in the quote's thread for the partner. */
  async negotiate(
    user: AuthUser,
    quoteId: string,
    input: { message: string; targetTotalPaise?: number },
  ) {
    return this.db.transaction(async (tx) => {
      const q = await this.lockCustomerQuote(tx, user, quoteId);
      if (q.status !== 'sent')
        throw new ConflictException(`A ${q.status} quote cannot be negotiated`);
      const message = input.targetTotalPaise
        ? `${input.message} (counter-offer: ₹${(input.targetTotalPaise / 100).toLocaleString('en-IN')})`
        : input.message;
      const [row] = await tx
        .insert(quoteRevisions)
        .values({
          quoteId,
          version: q.version,
          snapshot: { counterOfferPaise: input.targetTotalPaise ?? null },
          authorId: user.id,
          message,
        })
        .returning();
      return row!;
    });
  }

  /**
   * The hire: accepts the quote, closes the competing quotes and creates the job. Returns
   * the job and the customer's one-time start code.
   */
  async accept(user: AuthUser, quoteId: string) {
    const hired = await this.db.transaction(async (tx) => {
      const q = await this.lockCustomerQuote(tx, user, quoteId);
      if (q.status !== 'sent')
        throw new ConflictException(`A ${q.status} quote cannot be accepted`);
      if (q.validUntil && q.validUntil.getTime() < Date.now()) {
        throw new BadRequestException({
          code: 'QUOTE_EXPIRED',
          message: 'This quote has expired. Ask the partner to revise it.',
        });
      }
      await tx.update(quotes).set({ status: 'accepted' }).where(eq(quotes.id, quoteId));
      await tx
        .update(quotes)
        .set({ status: 'rejected' })
        .where(
          and(
            eq(quotes.requirementId, q.requirementId),
            ne(quotes.id, quoteId),
            eq(quotes.status, 'sent'),
          ),
        );
      const hired = await this.jobs.hire(tx, {
        requirementId: q.requirementId,
        quoteId,
        partnerId: q.partnerId,
        agreedTotalPaise: q.totalPaise,
        actor: { type: 'customer', id: user.id },
      });
      await tx.insert(events).values({
        userId: user.id,
        name: 'hire',
        properties: { quoteId, jobId: hired.job.id, totalPaise: q.totalPaise },
      });
      return hired;
    });
    const event: JobHiredEvent = {
      jobId: hired.job.id,
      requirementId: hired.job.requirementId,
      customerId: hired.job.customerId,
      partnerId: hired.job.partnerId,
    };
    await this.emit(DomainEvents.JobHired, event);
    return hired;
  }
}
