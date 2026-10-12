import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { SmsProvider } from './sms.provider';

/**
 * MSG91 Flow API. The DLT-registered OTP template must contain a variable named `otp`
 * (##otp##); its text should match `strings[locale].otpSms` in @setu/domain.
 */
@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  private readonly logger = new Logger('Msg91Sms');

  constructor(
    private readonly authKey: string,
    private readonly templateId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const res = await this.fetchImpl('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: {
        authkey: this.authKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        template_id: this.templateId,
        short_url: '0',
        recipients: [{ mobiles: phone.replace(/^\+/, ''), otp: code }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      this.logger.error(`MSG91 send failed: ${res.status} ${await res.text().catch(() => '')}`);
      throw new ServiceUnavailableException('Could not send the code. Please try again.');
    }
  }
}
