import { z } from 'zod';
import { addressInputSchema } from './common';

const DAY_MS = 86_400_000;

/** How far ahead a slot can be booked, and the least notice a partner gets. */
export const BOOKING_WINDOW_DAYS = 14;
export const BOOKING_MIN_NOTICE_MINUTES = 60;

/** A line of an instant booking, priced from the catalogue when the booking is made. */
export const bookingItemSchema = z.object({
  serviceId: z.string().uuid(),
  name: z.string(),
  quantity: z.number().int().min(1).max(20),
  unitPricePaise: z.number().int().nonnegative(),
});

/** Stored on a service requirement that came from the instant-booking menu. */
export const bookingDetailsSchema = z.object({
  items: z.array(bookingItemSchema).min(1).max(20),
  slotStart: z.iso.datetime({ offset: true }),
  totalPaise: z.number().int().nonnegative(),
  /** The professional the customer chose; only they get the lead. */
  preferredPartnerId: z.string().uuid().optional(),
});
export type BookingDetails = z.infer<typeof bookingDetailsSchema>;

export const createBookingSchema = z
  .object({
    categoryId: z.string().uuid(),
    items: z
      .array(
        z.object({
          serviceId: z.string().uuid(),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .min(1, 'Add at least one service')
      .max(20),
    slotStart: z.iso.datetime({ offset: true }).refine((s) => {
      const t = new Date(s).getTime() - Date.now();
      return t >= BOOKING_MIN_NOTICE_MINUTES * 60_000 && t <= BOOKING_WINDOW_DAYS * DAY_MS;
    }, 'Pick a slot at least an hour from now and within two weeks'),
    addressId: z.string().uuid().optional(),
    address: addressInputSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    /** "I'll choose my professional": one from GET /v1/catalog/pros. Same price either way. */
    partnerId: z.string().uuid().optional(),
  })
  .refine((b) => b.addressId || b.address, { message: 'Add an address', path: ['address'] });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
