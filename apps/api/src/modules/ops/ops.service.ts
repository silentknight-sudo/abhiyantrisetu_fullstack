import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TRADES } from '@setu/domain';
import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import {
  addresses,
  auditLog,
  events,
  jobs,
  partners,
  pilotSectors,
  reports,
  requirements,
  users,
} from '../../db/schema';
import { MatchingService } from '../matching/matching.service';

const OPEN = ['requested', 'matched', 'quoted'] as const;
const HOUR_MS = 3_600_000;
/** Lower-case, single-spaced: "Sector  150 " → "sector 150". */
export const normSector = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Operations: matching queue and rescue, trust & safety reports, funnel, pilot sectors. */
@Injectable()
export class OpsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(MatchingService) private readonly matching: MatchingService,
  ) {}

  // ---------- matching queue ----------

  /** Open requests, oldest first, flagged when 24 hours pass with fewer than 2 quotes. */
  async matchingQueue() {
    const rows = await this.db
      .select({
        id: requirements.id,
        title: requirements.title,
        type: requirements.type,
        status: requirements.status,
        sector: addresses.sector,
        customerPhone: users.phone,
        createdAt: requirements.createdAt,
        leadsSent: sql<number>`(SELECT count(*)::int FROM leads l WHERE l.requirement_id = ${requirements.id})`,
        quotes: sql<number>`(SELECT count(*)::int FROM quotes q JOIN leads l ON l.id = q.lead_id WHERE l.requirement_id = ${requirements.id})`,
      })
      .from(requirements)
      .innerJoin(users, eq(users.id, requirements.customerId))
      .innerJoin(addresses, eq(addresses.id, requirements.addressId))
      .where(inArray(requirements.status, [...OPEN]))
      .orderBy(requirements.createdAt)
      .limit(300);
    return rows.map((r) => {
      const ageHours = Math.floor((Date.now() - r.createdAt.getTime()) / HOUR_MS);
      return { ...r, ageHours, atRisk: ageHours >= 24 && r.quotes < 2 };
    });
  }

  /** Send the request to more professionals (wider reach), and log who did it. */
  async rescue(staff: AuthUser, requirementId: string, ip: string) {
    const [req] = await this.db
      .select({ status: requirements.status })
      .from(requirements)
      .where(eq(requirements.id, requirementId));
    if (!req) throw new NotFoundException();
    if (!(OPEN as readonly string[]).includes(req.status)) {
      throw new BadRequestException('This request is no longer open');
    }
    const { leadCount } = await this.matching.matchRequirement(requirementId, { rescue: true });
    await this.db.insert(auditLog).values({
      actorId: staff.id,
      action: 'requirement.rescued',
      entityType: 'requirement',
      entityId: requirementId,
      after: { leadsSent: leadCount },
      ip,
    });
    return { leadsSent: leadCount };
  }

  // ---------- trust & safety ----------

  /** A customer reports a professional they hired (or were matched with). */
  async report(
    user: AuthUser,
    input: { partnerId: string; jobId?: string; reason: string; details?: string },
  ) {
    const [p] = await this.db
      .select({ id: partners.id, userId: partners.userId })
      .from(partners)
      .where(eq(partners.id, input.partnerId));
    if (!p) throw new NotFoundException('Professional not found');
    if (p.userId === user.id) throw new BadRequestException('You cannot report yourself');
    if (input.jobId) {
      const [j] = await this.db
        .select({ id: jobs.id })
        .from(jobs)
        .where(
          and(
            eq(jobs.id, input.jobId),
            eq(jobs.customerId, user.id),
            eq(jobs.partnerId, input.partnerId),
          ),
        );
      if (!j) throw new BadRequestException('That job is not yours with this professional');
    }
    // One open report per customer and professional is enough; repeat taps update it.
    const [open] = await this.db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, user.id),
          eq(reports.partnerId, input.partnerId),
          eq(reports.status, 'open'),
        ),
      );
    const values = {
      jobId: input.jobId ?? null,
      reason: input.reason,
      details: input.details?.trim() || null,
    };
    if (open) {
      await this.db.update(reports).set(values).where(eq(reports.id, open.id));
    } else {
      await this.db
        .insert(reports)
        .values({ reporterId: user.id, partnerId: input.partnerId, ...values });
    }
    return { ok: true as const };
  }

  async reports(status?: 'open' | 'actioned' | 'dismissed') {
    const rows = await this.db
      .select({
        r: reports,
        partnerName: partners.displayName,
        reporterPhone: users.phone,
        openAgainstPartner: sql<number>`(SELECT count(*)::int FROM reports o WHERE o.partner_id = ${reports.partnerId} AND o.status = 'open')`,
      })
      .from(reports)
      .innerJoin(partners, eq(partners.id, reports.partnerId))
      .innerJoin(users, eq(users.id, reports.reporterId))
      .where(status ? eq(reports.status, status) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(200);
    return rows.map(({ r, ...rest }) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolutionNote: r.resolutionNote,
      partnerId: r.partnerId,
      jobId: r.jobId,
      createdAt: r.createdAt,
      ...rest,
    }));
  }

  async resolve(
    staff: AuthUser,
    id: string,
    input: { status: 'actioned' | 'dismissed'; note: string },
    ip: string,
  ) {
    const [r] = await this.db.select().from(reports).where(eq(reports.id, id));
    if (!r) throw new NotFoundException();
    if (r.status !== 'open') throw new BadRequestException('This report is already closed');
    await this.db.transaction(async (tx) => {
      await tx
        .update(reports)
        .set({
          status: input.status,
          resolutionNote: input.note,
          resolvedById: staff.id,
          resolvedAt: new Date(),
        })
        .where(eq(reports.id, id));
      await tx.insert(auditLog).values({
        actorId: staff.id,
        action: `report.${input.status}`,
        entityType: 'partner',
        entityId: r.partnerId,
        before: { reason: r.reason, status: r.status },
        after: { status: input.status, note: input.note },
        ip,
      });
    });
    const [after] = (await this.reports()).filter((x) => x.id === id);
    return after!;
  }

  // ---------- funnel & supply ----------

  async funnel(days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    const inWindow = gte(requirements.createdAt, since);
    const [[posted], [matched], [quoted], [hired], [done], [noMatch], [median], supply, open] =
      await Promise.all([
        this.db.select({ n: count() }).from(requirements).where(inWindow),
        this.db
          .select({ n: count() })
          .from(requirements)
          .where(and(inWindow, sql`${requirements.matchedAt} IS NOT NULL`)),
        this.db
          .select({ n: count() })
          .from(requirements)
          .where(and(inWindow, sql`${requirements.firstQuoteAt} IS NOT NULL`)),
        this.db
          .select({ n: count() })
          .from(requirements)
          .where(and(inWindow, sql`${requirements.hiredAt} IS NOT NULL`)),
        this.db
          .select({ n: count() })
          .from(jobs)
          .innerJoin(requirements, eq(requirements.id, jobs.requirementId))
          .where(and(inWindow, eq(jobs.state, 'closed'))),
        this.db
          .select({ n: count() })
          .from(events)
          .where(and(eq(events.name, 'requirement_no_match'), gte(events.occurredAt, since))),
        this.db
          .select({
            h: sql<
              string | null
            >`percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM ${requirements.firstQuoteAt} - ${requirements.createdAt}) / 3600)`,
          })
          .from(requirements)
          .where(and(inWindow, sql`${requirements.firstQuoteAt} IS NOT NULL`)),
        this.db.execute(sql`
          SELECT t AS trade,
                 count(*) FILTER (WHERE p.verification_status = 'verified')::int AS verified,
                 count(*) FILTER (WHERE p.verification_status = 'verified' AND p.is_online)::int AS online
          FROM partners p, unnest(p.trades) AS t
          GROUP BY t`) as unknown as Promise<{ trade: string; verified: number; online: number }[]>,
        this.db.execute(sql`
          SELECT coalesce(c.slug, r.type::text) AS key, count(*)::int AS n
          FROM requirements r LEFT JOIN categories c ON c.id = r.category_id
          WHERE r.status IN ('requested', 'matched', 'quoted')
          GROUP BY 1`) as unknown as Promise<{ key: string; n: number }[]>,
      ]);
    const trades = new Set<string>([...TRADES, ...supply.map((s) => s.trade)]);
    return {
      days,
      steps: [
        { key: 'posted', n: posted?.n ?? 0 },
        { key: 'matched', n: matched?.n ?? 0 },
        { key: 'quoted', n: quoted?.n ?? 0 },
        { key: 'hired', n: hired?.n ?? 0 },
        { key: 'completed', n: done?.n ?? 0 },
      ],
      medianHoursToFirstQuote: median?.h == null ? null : Math.round(Number(median.h) * 10) / 10,
      supply: [...trades]
        .map((trade) => {
          const s = supply.find((x) => x.trade === trade);
          return {
            trade,
            verifiedPartners: s?.verified ?? 0,
            onlinePartners: s?.online ?? 0,
            openRequests: open.find((o) => o.key === trade)?.n ?? 0,
          };
        })
        .sort((a, b) => a.verifiedPartners - b.verifiedPartners || b.openRequests - a.openRequests),
      noMatch: noMatch?.n ?? 0,
    };
  }

  // ---------- pilot sectors ----------

  async sectors() {
    const rows = await this.db.select().from(pilotSectors).orderBy(pilotSectors.name);
    const stats = (await this.db.execute(sql`
      SELECT lower(regexp_replace(trim(a.sector), '\\s+', ' ', 'g')) AS name,
             count(DISTINCT a.user_id)::int AS customers,
             count(DISTINCT r.id) FILTER (WHERE r.status IN ('requested','matched','quoted'))::int AS open
      FROM addresses a LEFT JOIN requirements r ON r.address_id = a.id
      WHERE a.sector IS NOT NULL
      GROUP BY 1`)) as unknown as { name: string; customers: number; open: number }[];
    return rows.map((s) => {
      const st = stats.find((x) => x.name === s.name);
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        customers: st?.customers ?? 0,
        openRequests: st?.open ?? 0,
      };
    });
  }

  async upsertSector(
    staff: AuthUser,
    input: { name: string; status: 'live' | 'waitlist' },
    ip: string,
  ) {
    const name = normSector(input.name);
    await this.db
      .insert(pilotSectors)
      .values({ name, status: input.status })
      .onConflictDoUpdate({
        target: pilotSectors.name,
        set: { status: input.status, updatedAt: new Date() },
      });
    await this.db.insert(auditLog).values({
      actorId: staff.id,
      action: 'sector.set',
      entityType: 'sector',
      entityId: name,
      after: { name, status: input.status },
      ip,
    });
    return (await this.sectors()).find((s) => s.name === name)!;
  }

  /** Is a sector served? With no sectors configured, everything counts as live. */
  async coverage(sector: string) {
    const name = normSector(sector);
    const [any] = await this.db.select({ n: count() }).from(pilotSectors);
    if (!any?.n) return { sector: name, status: 'live' as const };
    const [s] = await this.db.select().from(pilotSectors).where(eq(pilotSectors.name, name));
    return { sector: name, status: s ? s.status : ('unknown' as const) };
  }
}
