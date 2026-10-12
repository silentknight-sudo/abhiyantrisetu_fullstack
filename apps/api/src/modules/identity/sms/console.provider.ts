import { Injectable, Logger } from '@nestjs/common';
import type { SmsProvider } from './sms.provider';

/** Development/test only (env validation forbids it in production). Logs the OTP. */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger('ConsoleSms');
  private readonly sent = new Map<string, string>();

  async sendOtp(phone: string, code: string): Promise<void> {
    this.sent.set(phone, code);
    if (process.env.NODE_ENV !== 'test') this.logger.log(`OTP for ${phone}: ${code}`);
  }

  /** Test helper. */
  lastCodeFor(phone: string): string | undefined {
    return this.sent.get(phone);
  }
}
