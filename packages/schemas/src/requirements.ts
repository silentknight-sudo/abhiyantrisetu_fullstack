import { bookingDetailsSchema } from './bookings';
import { z } from 'zod';
import { addressInputSchema, fileKeySchema, paiseSchema } from './common';

const photos = z.array(fileKeySchema).max(10).default([]);
const description = z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(2000);

export const serviceDetailsSchema = z.object({
  serviceId: z.string().uuid().optional(),
  description,
  urgency: z.enum(['asap', 'today', 'this_week', 'flexible']).default('flexible'),
  photos,
  /** Set only by POST /v1/bookings; rejected on a hand-posted requirement. */
  booking: bookingDetailsSchema.optional(),
});

export const renovationDetailsSchema = z.object({
  propertyType: z.enum(['apartment', 'independent_house', 'villa', 'commercial', 'plot']),
  scope: z.array(z.string().trim().min(2).max(60)).min(1, 'Pick at least one area of work').max(20),
  areaSqft: z.number().int().positive().max(1_000_000).optional(),
  description,
  wantsSiteVisit: z.boolean().default(true),
  photos,
});

export const materialRfqDetailsSchema = z
  .object({
    items: z
      .array(
        z.object({
          name: z.string().trim().min(2, 'Item names need at least 2 characters').max(120),
          quantity: z
            .number({ error: 'Enter a quantity for each item' })
            .positive('Enter a quantity for each item'),
          unit: z.enum([
            'bag',
            'kg',
            'tonne',
            'cft',
            'cum',
            'sqft',
            'piece',
            'litre',
            'metre',
            'truck',
          ]),
          brand: z.string().trim().max(60).optional(),
          spec: z.string().trim().max(200).optional(),
        }),
      )
      .max(200)
      .default([]),
    /** Uploaded BOQ (Excel/PDF/photo); BOQ AI turns it into `items` in Phase 3. */
    boqFileKey: fileKeySchema.optional(),
    deliveryBy: z.iso.date().optional(),
    needsUnloading: z.boolean().default(false),
    /** A GST invoice is needed (businesses, builders). */
    gstInvoice: z.boolean().default(false),
  })
  .refine((d) => d.items.length > 0 || d.boqFileKey, {
    message: 'Add at least one item or upload a BOQ',
    path: ['items'],
  });

export const equipmentDetailsSchema = z.object({
  equipmentType: z.string().trim().min(2, 'Tell us which equipment you need').max(80),
  quantity: z.number().int().positive().max(50).default(1),
  durationDays: z
    .number({ error: 'Enter the number of days' })
    .int()
    .positive('Enter the number of days')
    .max(365),
  withOperator: z.boolean().default(true),
  /** How it is billed; durationDays counts days (or trips, or months). */
  rentBy: z.enum(['hour', 'day', 'month', 'trip']).default('day'),
  hoursPerDay: z.number().int().min(1).max(24).optional(),
  fuelIncluded: z.boolean().default(false),
  transportNeeded: z.boolean().default(true),
  roadAccess: z.enum(['wide', 'narrow', 'tight']).optional(),
  workType: z.string().trim().max(60).optional(),
  startDate: z.iso.date({ error: 'Pick a start date' }),
  spec: z.string().trim().max(500).optional(),
});

export const consultDetailsSchema = z.object({
  topic: z.enum(['structural', 'architecture', 'interior', 'vastu', 'cost_estimate', 'other']),
  description,
  mode: z.enum(['site_visit', 'call']).default('site_visit'),
});

export const requirementDetailsSchemas = {
  service: serviceDetailsSchema,
  renovation: renovationDetailsSchema,
  material_rfq: materialRfqDetailsSchema,
  equipment: equipmentDetailsSchema,
  consult: consultDetailsSchema,
} as const;

const base = {
  title: z.string().trim().min(3, 'Add a short title (at least 3 characters)').max(120),
  categoryId: z.string().uuid().optional(),
  /** Either an existing saved address or a new one. */
  addressId: z.string().uuid().optional(),
  address: addressInputSchema.optional(),
  budgetMinPaise: paiseSchema.optional(),
  budgetMaxPaise: paiseSchema.optional(),
  orgId: z.string().uuid().optional(),
  /** Up to 5 professionals the customer picked to quote; empty lets Setu match. */
  partnerIds: z.array(z.string().uuid()).max(5, 'Pick up to 5 professionals').optional(),
};

export const createRequirementSchema = z
  .discriminatedUnion('type', [
    z.object({ ...base, type: z.literal('service'), details: serviceDetailsSchema }),
    z.object({ ...base, type: z.literal('renovation'), details: renovationDetailsSchema }),
    z.object({ ...base, type: z.literal('material_rfq'), details: materialRfqDetailsSchema }),
    z.object({ ...base, type: z.literal('equipment'), details: equipmentDetailsSchema }),
    z.object({ ...base, type: z.literal('consult'), details: consultDetailsSchema }),
  ])
  .refine((r) => Boolean(r.addressId) !== Boolean(r.address), {
    message: 'Provide either addressId or address',
    path: ['address'],
  })
  .refine(
    (r) =>
      r.budgetMinPaise == null || r.budgetMaxPaise == null || r.budgetMinPaise <= r.budgetMaxPaise,
    { message: 'Minimum budget cannot exceed maximum', path: ['budgetMinPaise'] },
  );

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;

export const cancelRequirementSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
