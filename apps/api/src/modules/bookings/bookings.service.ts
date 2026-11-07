import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { bookingDetailsSchema, type CreateBookingInput } from '@setu/schemas';
import { and, eq, inArray } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { categories, leads, quotes, requirements, services } from '../../db/schema';
import { JobsService } from '../jobs/jobs.service';
import { PartnersService } from '../partners/partners.service';
import { QuotesService } from '../quotes/quotes.service';
import { RequirementsService } from '../requirements/requirements.service';

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

/**
 * Instant booking, the Urban Company way: the customer picks fixed-price services and a
 * slot, nearby partners are alerted, and the first to accept is hired and scheduled. No
 * quotes to compare: the price is the catalogue price.
 */
@Injectable()
export class BookingsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(RequirementsService) private readonly requirements: RequirementsService,
    @Inject(QuotesService) private readonly quotes: QuotesService,
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(PartnersService) private readonly partners: PartnersService,
  ) {}

  async create(user: AuthUser, input: CreateBookingInput) {
    const [cat] = await this.db
      .select({ id: categories.id, nameEn: categories.nameEn })
      .from(categories)
      .where(and(eq(categories.id, input.categoryId), eq(categories.isActive, true)));
    if (!cat) throw new BadRequestException('Unknown category');

    const ids = [...new Set(input.items.map((i) => i.serviceId))];
    if (ids.length !== input.items.length) {
      throw new BadRequestException('Each service can be added once; change its quantity');
    }
    const rows = await this.db
      .select()
      .from(services)
      .where(and(inArray(services.id, ids), eq(services.isActive, true)));
    const items = input.items.map((i) => {
      const s = rows.find((r) => r.id === i.serviceId);
      if (!s || s.categoryId !== cat.id) {
        throw new BadRequestException('A service in your cart is no longer available');
      }
      return {
        serviceId: s.id,
        name: s.nameEn,
        quantity: i.quantity,
        unitPricePaise: s.basePricePaise,
      };
    });
    const totalPaise = items.reduce((t, i) => t + i.quantity * i.unitPricePaise, 0);
    const summary = items.map((i) => (i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name));
    const description = [`Booked: ${summary.join(', ')}. Total ${rupees(totalPaise)}.`, input.notes]
      .filter(Boolean)
      .join('\n');

    return this.requirements.create(
      user,
      {
        type: 'service',
        title: items.length === 1 ? items[0]!.name : `${cat.nameEn}: ${items.length} services`,
        categoryId: cat.id,
        addressId: input.addressId,
        address: input.address,
        details: {
          description,
          urgency: 'flexible',
          photos: [],
          booking: { items, slotStart: input.slotStart, totalPaise },
        },
      },
      true,
    );
  }

  /**
   * A partner takes a booking: quotes the catalogue price, the booking is accepted on the
   * customer's behalf (they agreed to that price when booking) and the job is scheduled for
   * the chosen slot. Only the first partner gets it; the rest get 409.
   */
  async accept(user: AuthUser, leadId: string) {
    const me = await this.partners.requireMine(user);
    const [row] = await this.db
      .select({ lead: leads, req: requirements })
      .from(leads)
      .innerJoin(requirements, eq(requirements.id, leads.requirementId))
      .where(eq(leads.id, leadId));
    if (!row || row.lead.partnerId !== me.id) throw new NotFoundException();
    const parsed = bookingDetailsSchema.safeParse(
      (row.req.details as { booking?: unknown }).booking,
    );
    if (!parsed.success) throw new BadRequestException('This lead is not an instant booking');
    const booking = parsed.data;
    if (!['matched', 'quoted'].includes(row.req.status)) {
      throw new ConflictException('Another partner already took this booking');
    }
    const slot = new Date(booking.slotStart);
    if (slot.getTime() <= Date.now()) throw new ConflictException('This booking slot has passed');

    const quote = await this.quotes.createQuote(user, leadId, {
      items: booking.items.map((i) => ({
        description: i.name,
        quantity: i.quantity,
        unitPricePaise: i.unitPricePaise,
      })),
      gst: null,
      notes: 'Instant booking at the listed price',
      validDays: 1,
    });
    const customer: AuthUser = { id: row.req.customerId, roles: ['customer'] };
    try {
      const hired = await this.quotes.accept(customer, quote.id);
      return this.jobs.schedule(user, hired.job.id, slot);
    } catch (err) {
      // Lost the race: someone else's acceptance closed this quote.
      await this.db
        .update(quotes)
        .set({ status: 'withdrawn' })
        .where(and(eq(quotes.id, quote.id), eq(quotes.status, 'sent')));
      if (err instanceof ConflictException) {
        throw new ConflictException('Another partner already took this booking');
      }
      throw err;
    }
  }
}
