import { z } from 'zod';
import { phoneSchema } from './common';

export const otpSendSchema = z.object({
  phone: phoneSchema,
});
export type OtpSendInput = z.infer<typeof otpSendSchema>;

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  /** Stable per-install id; partner accounts are bound to a device. */
  deviceId: z.string().trim().min(8).max(128).optional(),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(256),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresIn: z.number().int(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    phone: z.string(),
    name: z.string().nullable(),
    roles: z.array(z.string()),
    isNew: z.boolean(),
  }),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;
