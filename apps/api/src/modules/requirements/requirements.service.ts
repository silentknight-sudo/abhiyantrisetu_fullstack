import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isStaff, requirementMachine, type RequirementEvent } from '@setu/domain';
import type { CreateRequirementInput } from '@setu/schemas';
import { and, desc, eq } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import { assertTransition } from '../../common/transition-error';
import type { Db, Tx } from '../../db/client';
import { DB } from '../../db/db.module';
import { addresses, categories, events, requirementEvents, requirements } from '../../db/schema';

/** Emitted after a requirement is committed. Payload: { requirementId }. */
export const REQUIREMENT_CREATED = 'requirement.created';

@Injectable()
export class RequirementsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(EventEmitter2) private readonly bus: EventEmitter2,
  ) {}

  async create(user: AuthUser, input: CreateRequirementInput) {
    const created = await this.db.transaction(async (tx) => {
      let addressId = input.addressId;
      if (addressId) {
        const [owned] = await tx
          .select({ id: addresses.id })
          .from(addresses)
          .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)));
        if (!owned) throw new BadRequestException('Unknown address');
      } else {
        const [created] = await tx
          .insert(addresses)
          .values({ ...input.address!, userId: user.id })
          .returning({ id: addresses.id });
        addressId = created!.id;
      }

      if (input.categoryId) {
        const [cat] = await tx
          .select({ type: categories.requirementType })
          .from(categories)
          .where(and(eq(categories.id, input.categoryId), eq(categories.isActive, true)));
        if (!cat) throw new BadRequestException('Unknown category');
        if (cat.type !== input.type) {
          throw new BadRequestException(`Category does not accept '${input.type}' requirements`);
        }
      }

      const [req] = await tx
        .insert(requirements)
        .values({
          customerId: user.id,
          orgId: input.orgId,
          type: input.type,
          categoryId: input.categoryId,
          title: input.title,
          details: input.details,
          addressId,
          budgetMinPaise: input.budgetMinPaise,
          budgetMaxPaise: input.budgetMaxPaise,
        })
        .returning();
      await tx.insert(requirementEvents).values({
        requirementId: req!.id,
        event: 'create',
        fromStatus: null,
        toStatus: 'requested',
        actorType: 'customer',
        actorId: user.id,
      });
      await tx.insert(events).values({
        userId: user.id,
        name: 'requirement_posted',
        properties: { requirementId: req!.id, type: input.type },
      });
      return req!;
    });
    // Matching and notifications react to this; their failures never undo the post.
    await this.bus
      .emitAsync(REQUIREMENT_CREATED, { requirementId: created.id })
      .catch(() => undefined);
    const [fresh] = await this.db
      .select()
      .from(requirements)
      .where(eq(requirements.id, created.id));
    return fresh ?? created;
  }

  listMine(user: AuthUser) {
    return this.db
      .select()
      .from(requirements)
      .where(eq(requirements.customerId, user.id))
      .orderBy(desc(requirements.createdAt))
      .limit(100);
  }

  async get(user: AuthUser, id: string) {
    const [req] = await this.db.select().from(requirements).where(eq(requirements.id, id));
    // 404 rather than 403 so ids cannot be probed.
    if (!req || (req.customerId !== user.id && !isStaff(user.roles))) throw new NotFoundException();
    return req;
  }

  /** Applies a requirement transition inside `tx` with the row locked; writes an event row. */
  async transition(
    tx: Tx,
    id: string,
    event: RequirementEvent,
    actor: { type: 'customer' | 'partner' | 'ops' | 'system'; id?: string },
  ) {
    const [req] = await tx.select().from(requirements).where(eq(requirements.id, id)).for('update');
    if (!req) throw new NotFoundException();
    const res = requirementMachine.transition(req.status, event, actor.type);
    assertTransition(res);

    const now = new Date();
    const stamps =
      res.to === 'matched'
        ? { matchedAt: now }
        : res.to === 'quoted' && !req.firstQuoteAt
          ? { firstQuoteAt: now }
          : res.to === 'hired'
            ? { hiredAt: now }
            : {};
    const [updated] = await tx
      .update(requirements)
      .set({
        status: res.to,
        ...stamps,
        ...(event.type === 'cancel' ? { cancelReason: event.reason } : {}),
      })
      .where(eq(requirements.id, id))
      .returning();
    await tx.insert(requirementEvents).values({
      requirementId: id,
      event: event.type,
      fromStatus: res.from,
      toStatus: res.to,
      actorType: actor.type,
      actorId: actor.id,
      payload: event,
    });
    return updated!;
  }

  async cancel(user: AuthUser, id: string, reason: string) {
    const req = await this.get(user, id);
    const actorType = req.customerId === user.id ? 'customer' : 'ops';
    return this.db.transaction((tx) =>
      this.transition(tx, id, { type: 'cancel', reason }, { type: actorType, id: user.id }),
    );
  }
}
