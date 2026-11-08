import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isStaff, requirementMachine, type RequirementEvent } from '@setu/domain';
import type { CreateRequirementInput } from '@setu/schemas';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import { assertTransition } from '../../common/transition-error';
import type { Db, Tx } from '../../db/client';
import { DB } from '../../db/db.module';
import {
  addresses,
  categories,
  events,
  requirementEvents,
  requirements,
  users,
} from '../../db/schema';

/** Open (unhired, uncancelled) requests one customer may have at a time. */
export const MAX_OPEN_REQUESTS = 5;
import { StorageService } from '../storage/storage.service';

/** Emitted after a requirement is committed. Payload: { requirementId }. */
export const REQUIREMENT_CREATED = 'requirement.created';

@Injectable()
export class RequirementsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(EventEmitter2) private readonly bus: EventEmitter2,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  /** A requirement as clients see it: its photos as short-lived links. */
  private present<R extends { details: Record<string, unknown> }>(req: R) {
    return {
      ...req,
      photoUrls: this.storage.viewUrls(req.details.photos as unknown[] | undefined),
    };
  }

  /** `fromBooking` is set only by BookingsService, which prices the booking itself. */
  async create(user: AuthUser, input: CreateRequirementInput, fromBooking = false) {
    if (!fromBooking && 'booking' in input.details && input.details.booking) {
      throw new BadRequestException('Use /v1/bookings to book a fixed-price service');
    }
    const photos = 'photos' in input.details ? input.details.photos : [];
    if (photos.length) this.storage.assertOwned(user.id, 'requirement_photo', photos);
    const created = await this.db.transaction(async (tx) => {
      // Each post alerts every nearby partner, so cap how many can be open at once.
      // Locking the user row serialises concurrent posts from the same account.
      await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for('update');
      const [{ n } = { n: 0 }] = await tx
        .select({ n: count() })
        .from(requirements)
        .where(
          and(
            eq(requirements.customerId, user.id),
            inArray(requirements.status, ['requested', 'matched', 'quoted']),
          ),
        );
      if (n >= MAX_OPEN_REQUESTS && !isStaff(user.roles)) {
        throw new HttpException(
          {
            code: 'TOO_MANY_OPEN_REQUESTS',
            message: `You already have ${MAX_OPEN_REQUESTS} open requests. Hire someone or cancel one first.`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
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
    return this.present(fresh ?? created);
  }

  async listMine(user: AuthUser) {
    const rows = await this.db
      .select()
      .from(requirements)
      .where(eq(requirements.customerId, user.id))
      .orderBy(desc(requirements.createdAt))
      .limit(100);
    return rows.map((r) => this.present(r));
  }

  async get(user: AuthUser, id: string) {
    const [req] = await this.db.select().from(requirements).where(eq(requirements.id, id));
    // 404 rather than 403 so ids cannot be probed.
    if (!req || (req.customerId !== user.id && !isStaff(user.roles))) throw new NotFoundException();
    return this.present(req);
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
    const updated = await this.db.transaction((tx) =>
      this.transition(tx, id, { type: 'cancel', reason }, { type: actorType, id: user.id }),
    );
    return this.present(updated);
  }
}
