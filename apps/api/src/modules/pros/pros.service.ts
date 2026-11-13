import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { tradesFor } from '@setu/domain';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import {
  addresses,
  categories,
  jobs,
  type LatLng,
  partners,
  requirements,
  reviews,
  users,
} from '../../db/schema';

interface ProRow {
  id: string;
  display_name: string;
  trades: string[];
  rating_avg: string | null;
  rating_count: number;
  gstin: string | null;
  distance_km: number;
  jobs_done: number;
}

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] ?? null;

/**
 * Professionals a customer can pick for a booking ("I'll choose my professional"), and
 * reviews per category. Eligibility is the same as matching: verified, online, active,
 * in the right trade, and the customer's location within the partner's service radius.
 */
@Injectable()
export class ProsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private async category(slug: string) {
    const [cat] = await this.db
      .select({ id: categories.id, slug: categories.slug, type: categories.requirementType })
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.isActive, true)));
    if (!cat) throw new NotFoundException('Unknown category');
    return cat;
  }

  private async query(
    trades: readonly string[],
    at: LatLng,
    opts: { partnerId?: string; excludeUserId?: string } = {},
  ) {
    const point = sql`ST_SetSRID(ST_MakePoint(${at.lng}, ${at.lat}), 4326)::geography`;
    const tradeArray = sql`ARRAY[${sql.join(
      trades.map((t) => sql`${t}`),
      sql`, `,
    )}]::text[]`;
    return (await this.db.execute(sql`
      SELECT p.id, p.display_name, p.trades, p.rating_avg, p.rating_count, p.gstin,
             round((ST_Distance(p.base_location, ${point}) / 1000.0)::numeric, 1)::float AS distance_km,
             (SELECT count(*)::int FROM jobs j WHERE j.partner_id = p.id AND j.state = 'closed') AS jobs_done
      FROM partners p
      JOIN users u ON u.id = p.user_id
      WHERE p.verification_status = 'verified'
        AND p.is_online
        AND u.status = 'active'
        AND p.base_location IS NOT NULL
        AND p.trades && ${tradeArray}
        AND ST_DWithin(p.base_location, ${point}, p.service_radius_km * 1000)
        ${opts.partnerId ? sql`AND p.id = ${opts.partnerId}` : sql``}
        ${opts.excludeUserId ? sql`AND p.user_id <> ${opts.excludeUserId}` : sql``}
      ORDER BY p.rating_avg DESC NULLS LAST, distance_km
      LIMIT 30
    `)) as unknown as ProRow[];
  }

  async list(categorySlug: string, at: LatLng) {
    const cat = await this.category(categorySlug);
    const rows = await this.query(tradesFor(cat.type, cat.slug), at);
    return rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      trades: r.trades,
      ratingAvg: r.rating_avg,
      ratingCount: r.rating_count,
      jobsDone: r.jobs_done,
      distanceKm: Number(r.distance_km),
      gstRegistered: Boolean(r.gstin),
    }));
  }

  /** Throws unless this partner can take a booking in this category at this place. */
  async assertBookable(partnerId: string, categoryId: string, at: LatLng, customerId: string) {
    const [cat] = await this.db
      .select({ slug: categories.slug, type: categories.requirementType })
      .from(categories)
      .where(eq(categories.id, categoryId));
    if (!cat) throw new BadRequestException('Unknown category');
    const rows = await this.query(tradesFor(cat.type, cat.slug), at, {
      partnerId,
      excludeUserId: customerId,
    });
    if (!rows.length) {
      throw new BadRequestException(
        'This professional is not available for your area right now. Pick another or let Setu assign.',
      );
    }
  }

  async locationOf(addressId: string, userId: string): Promise<LatLng> {
    const [a] = await this.db
      .select({ location: addresses.location })
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
    if (!a?.location) throw new BadRequestException('Unknown address');
    return a.location;
  }

  /** Reviews of completed jobs in a category, with the star breakdown. */
  async categoryReviews(
    categorySlug: string,
    opts: { sort?: 'recent' | 'detailed'; sector?: string },
  ) {
    const cat = await this.category(categorySlug);
    const inCategory = eq(requirements.categoryId, cat.id);
    const breakdown = await this.db
      .select({ rating: reviews.rating, n: sql<number>`count(*)::int` })
      .from(reviews)
      .innerJoin(jobs, eq(jobs.id, reviews.jobId))
      .innerJoin(requirements, eq(requirements.id, jobs.requirementId))
      .where(inCategory)
      .groupBy(reviews.rating);
    const stars = [5, 4, 3, 2, 1].map((s) => breakdown.find((b) => b.rating === s)?.n ?? 0);
    const total = stars.reduce((a, b) => a + b, 0);
    const average = total
      ? Math.round((breakdown.reduce((s, b) => s + b.rating * b.n, 0) / total) * 100) / 100
      : null;

    const rows = await this.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        partnerReply: reviews.partnerReply,
        createdAt: reviews.createdAt,
        name: users.name,
        sector: addresses.sector,
        serviceTitle: requirements.title,
        partnerName: partners.displayName,
      })
      .from(reviews)
      .innerJoin(jobs, eq(jobs.id, reviews.jobId))
      .innerJoin(requirements, eq(requirements.id, jobs.requirementId))
      .innerJoin(addresses, eq(addresses.id, requirements.addressId))
      .innerJoin(users, eq(users.id, reviews.customerId))
      .innerJoin(partners, eq(partners.id, reviews.partnerId))
      .where(and(inCategory, opts.sector ? eq(addresses.sector, opts.sector) : undefined))
      .orderBy(
        ...(opts.sort === 'detailed'
          ? [desc(sql`coalesce(length(${reviews.comment}), 0)`), desc(reviews.createdAt)]
          : [desc(reviews.createdAt)]),
      )
      .limit(30);
    return {
      average,
      total,
      stars,
      reviews: rows.map(({ name, ...r }) => ({ ...r, customerFirstName: firstName(name) })),
    };
  }
}
