import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { isStaff } from '@setu/domain';
import type { CreateReviewInput } from '@setu/schemas';
import { desc, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import type { Db, Tx } from '../../db/client';
import { DB } from '../../db/db.module';
import { jobs, partners, reviews, users } from '../../db/schema';

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] ?? null;

@Injectable()
export class ReviewsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private async present(db: Db | Tx, reviewId: string) {
    const [row] = await db
      .select({ review: reviews, name: users.name })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.customerId))
      .where(eq(reviews.id, reviewId));
    if (!row) throw new NotFoundException();
    const { customerId: _c, partnerId: _p, ...review } = row.review;
    return { ...review, customerFirstName: firstName(row.name) };
  }

  /**
   * The customer reviews a closed job, once. The partner's average and count are
   * recomputed in the same transaction, so matching ranks on them immediately.
   */
  async create(user: AuthUser, jobId: string, input: CreateReviewInput) {
    return this.db.transaction(async (tx) => {
      const [job] = await tx.select().from(jobs).where(eq(jobs.id, jobId)).for('update');
      if (!job || job.customerId !== user.id) throw new NotFoundException();
      if (job.state !== 'closed') {
        throw new ConflictException({
          code: 'NOT_CLOSED',
          message: 'You can review the work once the job is closed',
        });
      }
      const [review] = await tx
        .insert(reviews)
        .values({
          jobId,
          partnerId: job.partnerId,
          customerId: user.id,
          rating: input.rating,
          comment: input.comment || null,
        })
        .onConflictDoNothing({ target: reviews.jobId })
        .returning({ id: reviews.id });
      if (!review)
        throw new ConflictException({
          code: 'ALREADY_REVIEWED',
          message: 'You have already reviewed this job',
        });
      await tx
        .update(partners)
        .set({
          ratingAvg: sql`(SELECT round(avg(${reviews.rating})::numeric, 2) FROM ${reviews} WHERE ${reviews.partnerId} = ${job.partnerId})`,
          ratingCount: sql`(SELECT count(*) FROM ${reviews} WHERE ${reviews.partnerId} = ${job.partnerId})`,
        })
        .where(eq(partners.id, job.partnerId));
      return this.present(tx, review.id);
    });
  }

  /** The job's review, for its customer, its partner or staff; null before one exists. */
  async forJob(user: AuthUser, jobId: string) {
    const [job] = await this.db
      .select({ customerId: jobs.customerId, partnerUserId: partners.userId })
      .from(jobs)
      .innerJoin(partners, eq(partners.id, jobs.partnerId))
      .where(eq(jobs.id, jobId));
    if (
      !job ||
      (job.customerId !== user.id && job.partnerUserId !== user.id && !isStaff(user.roles))
    ) {
      throw new NotFoundException();
    }
    const [r] = await this.db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.jobId, jobId));
    return r ? this.present(this.db, r.id) : null;
  }

  /** A partner's latest reviews, shown to customers comparing quotes. */
  async forPartner(partnerId: string) {
    const rows = await this.db
      .select({ review: reviews, name: users.name })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.customerId))
      .where(eq(reviews.partnerId, partnerId))
      .orderBy(desc(reviews.createdAt))
      .limit(20);
    return rows.map(({ review: { customerId: _c, partnerId: _p, ...r }, name }) => ({
      ...r,
      customerFirstName: firstName(name),
    }));
  }

  /** The reviewed partner answers, once. */
  async reply(user: AuthUser, reviewId: string, reply: string) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ review: reviews, partnerUserId: partners.userId })
        .from(reviews)
        .innerJoin(partners, eq(partners.id, reviews.partnerId))
        .where(eq(reviews.id, reviewId))
        .for('update', { of: reviews });
      if (!row || row.partnerUserId !== user.id) throw new NotFoundException();
      if (row.review.partnerReply) {
        throw new ConflictException({
          code: 'ALREADY_REPLIED',
          message: 'You have already replied to this review',
        });
      }
      await tx
        .update(reviews)
        .set({ partnerReply: reply, repliedAt: new Date() })
        .where(eq(reviews.id, reviewId));
      return this.present(tx, reviewId);
    });
  }
}
