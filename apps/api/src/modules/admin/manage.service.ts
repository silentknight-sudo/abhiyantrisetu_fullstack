import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isStaff } from '@setu/domain';
import type { AdminServiceInput, AdminServiceUpdate } from '@setu/schemas';
import { and, asc, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import { AccessRevocation } from '../../common/revocation';
import type { Db, Tx } from '../../db/client';
import { DB } from '../../db/db.module';
import {
  auditLog,
  categories,
  jobs,
  partners,
  refreshTokens,
  services,
  users,
} from '../../db/schema';

const serviceView = {
  id: services.id,
  categoryId: services.categoryId,
  categorySlug: categories.slug,
  slug: services.slug,
  nameEn: services.nameEn,
  nameHi: services.nameHi,
  groupEn: services.groupEn,
  groupHi: services.groupHi,
  description: services.description,
  unit: services.unit,
  durationMinutes: services.durationMinutes,
  pricePaise: services.basePricePaise,
  sortOrder: services.sortOrder,
  isActive: services.isActive,
};

/** Escape LIKE wildcards so a search for "50%" means the text, not a pattern. */
const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/** Admin changes: the booking catalogue, user accounts and the audit trail. All audited. */
@Injectable()
export class ManageService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AccessRevocation) private readonly revocation: AccessRevocation,
  ) {}

  // ---------- catalogue ----------

  listServices() {
    return this.db
      .select(serviceView)
      .from(services)
      .innerJoin(categories, eq(categories.id, services.categoryId))
      .orderBy(asc(categories.sortOrder), asc(services.sortOrder), asc(services.nameEn));
  }

  private async getService(db: Db | Tx, id: string) {
    const [row] = await db
      .select(serviceView)
      .from(services)
      .innerJoin(categories, eq(categories.id, services.categoryId))
      .where(eq(services.id, id));
    if (!row) throw new NotFoundException();
    return row;
  }

  async createService(staff: AuthUser, input: AdminServiceInput, ip: string) {
    return this.db.transaction(async (tx) => {
      const [cat] = await tx
        .select({ type: categories.requirementType })
        .from(categories)
        .where(eq(categories.id, input.categoryId));
      if (!cat) throw new BadRequestException('Unknown category');
      if (cat.type !== 'service') {
        throw new BadRequestException('Fixed-price services belong to home-service categories');
      }
      const [dupe] = await tx
        .select({ id: services.id })
        .from(services)
        .where(eq(services.slug, input.slug));
      if (dupe) throw new ConflictException('A service with this slug already exists');
      const { pricePaise, ...rest } = input;
      const [row] = await tx
        .insert(services)
        .values({ ...rest, basePricePaise: pricePaise })
        .returning({ id: services.id });
      await this.audit(tx, staff, 'service.create', 'service', row!.id, null, input, ip);
      return this.getService(tx, row!.id);
    });
  }

  async updateService(staff: AuthUser, id: string, input: AdminServiceUpdate, ip: string) {
    return this.db.transaction(async (tx) => {
      const before = await this.getService(tx, id);
      const { pricePaise, ...rest } = input;
      await tx
        .update(services)
        .set({ ...rest, ...(pricePaise !== undefined ? { basePricePaise: pricePaise } : {}) })
        .where(eq(services.id, id));
      const after = await this.getService(tx, id);
      const changed = Object.fromEntries(
        Object.keys(input).map((k) => [k, before[k as keyof typeof before]]),
      );
      await this.audit(tx, staff, 'service.update', 'service', id, changed, input, ip);
      return after;
    });
  }

  // ---------- users ----------

  async listUsers(q?: string) {
    const term = q?.replace(/\s+/g, '');
    const filter = term
      ? or(ilike(users.phone, likeTerm(term)), ilike(users.name, likeTerm(q!.trim())))
      : undefined;
    const rows = await this.db
      .select({
        id: users.id,
        phone: users.phone,
        name: users.name,
        roles: users.roles,
        status: users.status,
        boundDeviceId: users.boundDeviceId,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        partnerName: partners.displayName,
      })
      .from(users)
      .leftJoin(partners, eq(partners.userId, users.id))
      .where(filter)
      .orderBy(desc(users.createdAt))
      .limit(100);
    if (!rows.length) return [];
    const counts = await this.db
      .select({ customerId: jobs.customerId, n: count() })
      .from(jobs)
      .groupBy(jobs.customerId);
    const byCustomer = new Map(counts.map((r) => [r.customerId, Number(r.n)]));
    return rows.map(({ boundDeviceId, ...u }) => ({
      ...u,
      phoneLocked: Boolean(boundDeviceId),
      jobCount: byCustomer.get(u.id) ?? 0,
    }));
  }

  private async lockUser(tx: Tx, staff: AuthUser, id: string) {
    const [u] = await tx.select().from(users).where(eq(users.id, id)).for('update');
    if (!u) throw new NotFoundException();
    if (u.id === staff.id) throw new ForbiddenException('You cannot change your own account here');
    if (isStaff(u.roles) && !staff.roles.includes('super_admin')) {
      throw new ForbiddenException('Only a super admin can change staff accounts');
    }
    return u;
  }

  private async endSessions(tx: Tx, userId: string) {
    await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async setStatus(
    staff: AuthUser,
    id: string,
    status: 'active' | 'suspended',
    reason: string,
    ip: string,
  ) {
    await this.db.transaction(async (tx) => {
      const u = await this.lockUser(tx, staff, id);
      if (u.status === 'deleted') throw new ConflictException('This account was deleted');
      if (u.status === status) return;
      await tx.update(users).set({ status }).where(eq(users.id, id));
      if (status === 'suspended') await this.endSessions(tx, id);
      await this.audit(
        tx,
        staff,
        status === 'suspended' ? 'user.suspend' : 'user.reactivate',
        'user',
        id,
        { status: u.status },
        { status, reason },
        ip,
      );
    });
    if (status === 'suspended') await this.revocation.revoke(id);
    return this.userById(id);
  }

  /** Lets a partner log in on a new phone: clears the device lock and ends old sessions. */
  async resetDevice(staff: AuthUser, id: string, reason: string, ip: string) {
    await this.db.transaction(async (tx) => {
      const u = await this.lockUser(tx, staff, id);
      if (!u.boundDeviceId) throw new ConflictException('This account is not locked to a phone');
      await tx.update(users).set({ boundDeviceId: null }).where(eq(users.id, id));
      await this.endSessions(tx, id);
      await this.audit(tx, staff, 'user.reset_device', 'user', id, null, { reason }, ip);
    });
    await this.revocation.revoke(id);
    return this.userById(id);
  }

  private async userById(id: string) {
    const [u] = await this.db
      .select({
        id: users.id,
        phone: users.phone,
        name: users.name,
        roles: users.roles,
        status: users.status,
        boundDeviceId: users.boundDeviceId,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        partnerName: partners.displayName,
      })
      .from(users)
      .leftJoin(partners, eq(partners.userId, users.id))
      .where(eq(users.id, id));
    if (!u) throw new NotFoundException();
    const [{ n } = { n: 0 }] = await this.db
      .select({ n: count() })
      .from(jobs)
      .where(eq(jobs.customerId, id));
    const { boundDeviceId, ...rest } = u;
    return { ...rest, phoneLocked: Boolean(boundDeviceId), jobCount: Number(n) };
  }

  // ---------- audit ----------

  async auditTrail(filter: { entityType?: string; entityId?: string }) {
    const where = and(
      filter.entityType ? eq(auditLog.entityType, filter.entityType) : undefined,
      filter.entityId ? eq(auditLog.entityId, filter.entityId) : undefined,
    );
    return this.db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        actorPhone: users.phone,
        before: auditLog.before,
        after: auditLog.after,
        ip: auditLog.ip,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(where)
      .orderBy(desc(auditLog.id))
      .limit(200);
  }

  private audit(
    tx: Tx,
    staff: AuthUser,
    action: string,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
    ip: string,
  ) {
    return tx.insert(auditLog).values({
      actorId: staff.id,
      action,
      entityType,
      entityId,
      before: before ?? null,
      after: after ?? null,
      ip,
    });
  }
}
