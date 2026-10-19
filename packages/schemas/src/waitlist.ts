import { REQUIREMENT_TYPES } from '@setu/domain';
import { z } from 'zod';
import { phoneSchema } from './common';

export const WAITLIST_ROLES = ['customer', 'provider', 'supplier', 'society'] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

/** Early-access sign-up from the pre-launch website. */
export const waitlistSignupSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(80),
  phone: phoneSchema,
  role: z.enum(WAITLIST_ROLES, { error: 'Choose who you are' }),
  sector: z.string().trim().max(80).optional(),
  interests: z.array(z.enum(REQUIREMENT_TYPES)).max(REQUIREMENT_TYPES.length).default([]),
  /** Trade for providers, e.g. "plumber". */
  trade: z.string().trim().max(60).optional(),
  /** Which button or page the sign-up came from. */
  source: z.string().trim().max(80).optional(),
  /** DPDP: explicit consent to be contacted about the launch. */
  consent: z.literal(true, { error: 'Please agree to be contacted about the launch' }),
});
export type WaitlistSignupInput = z.infer<typeof waitlistSignupSchema>;
