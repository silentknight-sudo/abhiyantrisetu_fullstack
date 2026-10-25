import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PartnerProfileInput } from '@setu/schemas';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import type { Db, Tx } from '../../db/client';
import { DB } from '../../db/db.module';
import { auditLog, partners, users } from '../../db/schema';

type PartnerRow = typeof partners.$inferSelect;

@Injectable()
export class PartnersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findByUser(userId: string, db: Db | Tx = this.db): Promise<PartnerRow | undefined> {
    const [p] = await db.select().from(partners).where(eq(partners.userId, userId));
    return p;
  }

  /** The caller's partner profile, or 403 for users who are not partners. */
  async requireMine(user: AuthUser, db: Db | Tx = this.db): Promise<PartnerRow> {
    const p = await this.findByUser(user.id, db);
    if (!p)
      throw new ForbiddenException({
        code: 'NOT_A_PARTNER',
        message: 'Create a partner profile first',
      });
    return p;
  }

  /**
   * Registers the caller as a partner (verification pending) and adds the partner role.
   * The new role is in the access token after the next refresh.
   */
  async create(user: AuthUser, input: PartnerProfileInput) {
    return this.db.transaction(async (tx) => {
      if (await this.findByUser(user.id, tx))
        throw new ConflictException('Partner profile already exists');
      const [p] = await tx
        .insert(partners)
        .values({ ...input, userId: user.id, verificationStatus: 'pending' })
        .returning();
      await tx
        .update(users)
        .set({ roles: sql`array_append(${users.roles}, 'partner'::role)` })
        .where(and(eq(users.id, user.id), sql`NOT ('partner'::role = ANY(${users.roles}))`));
      return p!;
    });
  }

  async updateMine(user: AuthUser, input: Partial<PartnerProfileInput>) {
    const mine = await this.requireMine(user);
    // Changing trades or GSTIN after verification sends the profile back for review.
    const needsReview =
      mine.verificationStatus === 'verified' &&
      (input.trades !== undefined || input.gstin !== undefined);
    const [p] = await this.db
      .update(partners)
      .set({ ...input, ...(needsReview ? { verificationStatus: 'in_review' as const } : {}) })
      .where(eq(partners.id, mine.id))
      .returning();
    return p!;
  }

  /** Admin list, newest first, with the owner's phone so the team can call them. */
  async list(status?: PartnerRow['verificationStatus']) {
    const rows = await this.db
      .select({ partner: partners, phone: users.phone, ownerName: users.name })
      .from(partners)
      .innerJoin(users, eq(users.id, partners.userId))
      .where(status ? eq(partners.verificationStatus, status) : undefined)
      .orderBy(desc(partners.createdAt))
      .limit(200);
    return rows.map((r) => ({ ...r.partner, phone: r.phone, ownerName: r.ownerName }));
  }

  async setVerification(
    staff: AuthUser,
    partnerId: string,
    input: {
      status: 'verified' | 'rejected' | 'suspended';
      tier?: PartnerRow['tier'];
      reason?: string;
    },
    ip?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(partners)
        .where(eq(partners.id, partnerId))
        .for('update');
      if (!before) throw new NotFoundException();
      const tier =
        input.status === 'verified'
          ? (input.tier ?? (before.tier === 'basic' ? 'verified' : before.tier))
          : before.tier;
      const [after] = await tx
        .update(partners)
        .set({ verificationStatus: input.status, tier })
        .where(eq(partners.id, partnerId))
        .returning();
      await tx.insert(auditLog).values({
        actorId: staff.id,
        action: `partner.${input.status}`,
        entityType: 'partner',
        entityId: partnerId,
        before: { verificationStatus: before.verificationStatus, tier: before.tier },
        after: {
          verificationStatus: after!.verificationStatus,
          tier: after!.tier,
          reason: input.reason ?? null,
        },
        ip,
      });
      return after!;
    });
  }
}
