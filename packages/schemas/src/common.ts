import { LOCALES, normalizeIndianMobile } from '@setu/domain';
import { z } from 'zod';

/** Accepts common Indian mobile formats and outputs E.164 (+91XXXXXXXXXX). */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const normalized = normalizeIndianMobile(v);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid 10-digit Indian mobile number' });
      return z.NEVER;
    }
    return normalized;
  });

export const localeSchema = z.enum(LOCALES);

/** Integer paise, non-negative, below ₹1,000 crore. */
export const paiseSchema = z.number().int().nonnegative().max(1_000_000_000_000);

/** A point inside India's bounding box (WGS84). */
export const geoPointSchema = z.object({
  lat: z.number().min(6).max(37.5),
  lng: z.number().min(68).max(97.5),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

export const pincodeSchema = z.string().regex(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code');

/** Storage object key returned by the upload endpoint (never a public URL). */
export const fileKeySchema = z.string().min(1).max(512);

export const addressInputSchema = z.object({
  label: z.string().trim().max(40).optional(),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  sector: z.string().trim().max(80).optional(),
  tower: z.string().trim().max(40).optional(),
  flat: z.string().trim().max(40).optional(),
  city: z.string().trim().min(2).max(80),
  pincode: pincodeSchema,
  location: geoPointSchema,
});
export type AddressInput = z.infer<typeof addressInputSchema>;
