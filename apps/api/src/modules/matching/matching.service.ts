import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { MAX_LEADS_PER_REQUIREMENT, rankScore, tradesFor } from '@setu/domain';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { DomainEvents, type LeadsCreatedEvent } from '../../common/events';
import { DB } from '../../db/db.module';
import { categories, events, leads, requirements } from '../../db/schema';
import { REQUIREMENT_CREATED, RequirementsService } from '../requirements/requirements.service';

interface Candidate {
  id: string;
  distance_km: number;
  service_radius_km: number;
  rating_avg: string | null;
  rating_count: number;
  avg_response_minutes: number | null;
  acceptance_rate: string | null;
  tier: 'basic' | 'verified' | 'pro';
}

/**
 * Finds verified partners in the right trade whose own service radius covers the job,
 * ranks them with the shared rules, and sends leads to the best few.
 */
@Injectable()
export class MatchingService {
  private readonly logger = new Logger('Matching');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(RequirementsService) private readonly requirements: RequirementsService,
    @Inject(EventEmitter2) private readonly bus: EventEmitter2,
  ) {}

  @OnEvent(REQUIREMENT_CREATED, { promisify: true })
  async onRequirementCreated({ requirementId }: { requirementId: string }) {
    try {
      await this.matchRequirement(requirementId);
    } catch (err) {
      this.logger.error(`Matching failed for ${requirementId}: ${(err as Error).message}`);
    }
  }

  async matchRequirement(requirementId: string): Promise<{ leadCount: number }> {
    const [req] = await this.db
      .select({
        id: requirements.id,
        type: requirements.type,
        status: requirements.status,
        customerId: requirements.customerId,
        addressId: requirements.addressId,
        categorySlug: categories.slug,
      })
      .from(requirements)
      .leftJoin(categories, eq(categories.id, requirements.categoryId))
      .where(eq(requirements.id, requirementId));
    if (!req || req.status !== 'requested') return { leadCount: 0 };

    const trades = tradesFor(req.type, req.categorySlug);
    const tradeArray = sql`ARRAY[${sql.join(
      trades.map((t) => sql`${t}`),
      sql`, `,
    )}]::text[]`;

    const candidates = (await this.db.execute(sql`
      SELECT p.id, p.service_radius_km, p.rating_avg, p.rating_count, p.avg_response_minutes,
             p.acceptance_rate, p.tier,
             ST_Distance(p.base_location, a.location) / 1000.0 AS distance_km
      FROM partners p
      JOIN users u ON u.id = p.user_id
      JOIN addresses a ON a.id = ${req.addressId}
      WHERE p.verification_status = 'verified'
        AND u.status = 'active'
        AND p.user_id <> ${req.customerId}
        AND p.base_location IS NOT NULL
        AND p.trades && ${tradeArray}
        AND ST_DWithin(p.base_location, a.location, p.service_radius_km * 1000)
      ORDER BY distance_km
      LIMIT 50
    `)) as unknown as Candidate[];

    const ranked = candidates
      .map((c) => ({
        id: c.id,
        score: rankScore({
          distanceKm: Number(c.distance_km),
          radiusKm: c.service_radius_km,
          rating: c.rating_avg == null ? null : Number(c.rating_avg),
          ratingCount: c.rating_count,
          avgResponseMinutes: c.avg_response_minutes,
          acceptanceRate: c.acceptance_rate == null ? null : Number(c.acceptance_rate),
          tier: c.tier,
        }),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_LEADS_PER_REQUIREMENT);

    if (ranked.length === 0) {
      await this.db.insert(events).values({
        name: 'requirement_no_match',
        properties: { requirementId, trades },
      });
      this.logger.warn(`No partners for requirement ${requirementId} (${trades.join(', ')})`);
      return { leadCount: 0 };
    }

    const leadIds = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(leads)
        .values(
          ranked.map((r) => ({ requirementId, partnerId: r.id, matchScore: String(r.score) })),
        )
        .onConflictDoNothing()
        .returning({ id: leads.id });
      await this.requirements.transition(
        tx,
        requirementId,
        { type: 'match', leadCount: ranked.length },
        { type: 'system' },
      );
      return inserted.map((l) => l.id);
    });
    const event: LeadsCreatedEvent = { requirementId, leadIds };
    await this.bus.emitAsync(DomainEvents.LeadsCreated, event);
    return { leadCount: ranked.length };
  }
}
