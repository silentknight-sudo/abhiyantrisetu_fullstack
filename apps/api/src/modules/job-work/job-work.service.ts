import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AddJobExtraInput, AddJobPhotosInput } from '@setu/schemas';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { events, jobExtras, jobPhotos, jobs } from '../../db/schema';
import { JobsService } from '../jobs/jobs.service';
import { StorageService } from '../storage/storage.service';

const MAX_PENDING_EXTRAS = 10;
const MAX_PHOTOS_PER_KIND = 6;

/**
 * Work on site: extra parts or labour the partner adds (each approved by the customer,
 * which raises the amount due), and before/after photos.
 */
@Injectable()
export class JobWorkService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  /** 404 unless the caller is the job's customer, partner or staff. */
  private view(user: AuthUser, jobId: string) {
    return this.jobs.get(user, jobId);
  }

  async work(user: AuthUser, jobId: string) {
    const job = await this.view(user, jobId);
    const [extras, photos] = await Promise.all([
      this.db
        .select({
          id: jobExtras.id,
          description: jobExtras.description,
          amountPaise: jobExtras.amountPaise,
          status: jobExtras.status,
          createdAt: jobExtras.createdAt,
        })
        .from(jobExtras)
        .where(eq(jobExtras.jobId, jobId))
        .orderBy(asc(jobExtras.createdAt)),
      this.db
        .select({ kind: jobPhotos.kind, fileKey: jobPhotos.fileKey })
        .from(jobPhotos)
        .where(eq(jobPhotos.jobId, jobId))
        .orderBy(asc(jobPhotos.createdAt)),
    ]);
    const keys = (kind: 'before' | 'after') =>
      photos.filter((p) => p.kind === kind).map((p) => p.fileKey);
    return {
      extras,
      photos: {
        before: this.storage.viewUrls(keys('before')),
        after: this.storage.viewUrls(keys('after')),
      },
      totalPaise: job.agreedTotalPaise,
    };
  }

  async addExtra(user: AuthUser, jobId: string, input: AddJobExtraInput) {
    const job = await this.view(user, jobId);
    if (job.viewerRole !== 'partner')
      throw new ForbiddenException('Only the partner can add extras');
    if (job.state !== 'in_progress') {
      throw new ConflictException('Extras can be added only while the work is in progress');
    }
    const [{ n } = { n: 0 }] = await this.db
      .select({ n: count() })
      .from(jobExtras)
      .where(and(eq(jobExtras.jobId, jobId), eq(jobExtras.status, 'pending')));
    if (n >= MAX_PENDING_EXTRAS) {
      throw new ConflictException('Wait for the customer to answer the extras already sent');
    }
    await this.db.insert(jobExtras).values({ jobId, ...input });
    return this.work(user, jobId);
  }

  /** The customer's yes or no. A yes adds the amount to the job total in the same transaction. */
  async decide(user: AuthUser, jobId: string, extraId: string, approve: boolean) {
    const job = await this.view(user, jobId);
    if (job.viewerRole !== 'customer') throw new ForbiddenException('Only the customer can decide');
    await this.db.transaction(async (tx) => {
      const [locked] = await tx.select().from(jobs).where(eq(jobs.id, jobId)).for('update');
      if (!locked || !['in_progress', 'completed'].includes(locked.state)) {
        throw new ConflictException('This job can no longer change');
      }
      const [extra] = await tx
        .select()
        .from(jobExtras)
        .where(and(eq(jobExtras.id, extraId), eq(jobExtras.jobId, jobId)))
        .for('update');
      if (!extra) throw new NotFoundException();
      if (extra.status !== 'pending') throw new ConflictException('Already answered');
      await tx
        .update(jobExtras)
        .set({ status: approve ? 'approved' : 'declined', decidedAt: new Date() })
        .where(eq(jobExtras.id, extraId));
      if (approve) {
        await tx
          .update(jobs)
          .set({ agreedTotalPaise: sql`${jobs.agreedTotalPaise} + ${extra.amountPaise}` })
          .where(eq(jobs.id, jobId));
      }
      await tx.insert(events).values({
        userId: user.id,
        name: approve ? 'job_extra_approved' : 'job_extra_declined',
        properties: { jobId, extraId, amountPaise: extra.amountPaise },
      });
    });
    return this.work(user, jobId);
  }

  async addPhotos(user: AuthUser, jobId: string, input: AddJobPhotosInput) {
    const job = await this.view(user, jobId);
    if (job.viewerRole !== 'partner')
      throw new ForbiddenException('Only the partner can add photos');
    const allowed =
      input.kind === 'before' ? ['scheduled', 'in_progress'] : ['in_progress', 'completed'];
    if (!allowed.includes(job.state)) {
      throw new ConflictException(
        input.kind === 'before'
          ? 'Before photos are taken before or during the work'
          : 'After photos are taken once the work is under way',
      );
    }
    this.storage.assertOwned(user.id, 'job_photo', input.fileKeys);
    const [{ n } = { n: 0 }] = await this.db
      .select({ n: count() })
      .from(jobPhotos)
      .where(and(eq(jobPhotos.jobId, jobId), eq(jobPhotos.kind, input.kind)));
    if (n + input.fileKeys.length > MAX_PHOTOS_PER_KIND) {
      throw new BadRequestException(`Up to ${MAX_PHOTOS_PER_KIND} ${input.kind} photos per job`);
    }
    await this.db
      .insert(jobPhotos)
      .values(input.fileKeys.map((fileKey) => ({ jobId, kind: input.kind, fileKey })))
      .onConflictDoNothing({ target: jobPhotos.fileKey });
    return this.work(user, jobId);
  }
}
