import type { Locale } from '@setu/domain';

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/**
 * Adapter boundary for SMS. Swapping MSG91 for another vendor touches only a new
 * implementation of this interface.
 */
export interface SmsProvider {
  sendOtp(phone: string, code: string, locale: Locale): Promise<void>;
}
