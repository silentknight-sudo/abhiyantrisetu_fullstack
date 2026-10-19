import { TRADES } from '@setu/domain';
import { z } from 'zod';
import { geoPointSchema } from './common';

/** GSTIN: 2-digit state code, PAN, entity number, Z, checksum. */
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN');

export const partnerProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter the name customers will see').max(80),
  businessName: z.string().trim().max(120).optional(),
  trades: z.array(z.enum(TRADES)).min(1, 'Choose at least one trade').max(6),
  baseLocation: geoPointSchema,
  serviceRadiusKm: z.number().int().min(1).max(50).default(10),
  gstin: gstinSchema.optional(),
});
export type PartnerProfileInput = z.infer<typeof partnerProfileSchema>;

export const partnerProfileUpdateSchema = partnerProfileSchema.partial();

export const verifyPartnerSchema = z
  .object({
    status: z.enum(['verified', 'rejected', 'suspended']),
    tier: z.enum(['basic', 'verified', 'pro']).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.status === 'verified' || (v.reason && v.reason.length >= 3), {
    message: 'Give a reason when rejecting or suspending',
    path: ['reason'],
  });
