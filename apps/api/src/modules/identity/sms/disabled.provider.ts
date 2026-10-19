import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { SmsProvider } from './sms.provider';

/** Pre-launch: phone login is not open yet, so no OTP is sent. */
@Injectable()
export class DisabledSmsProvider implements SmsProvider {
  async sendOtp(): Promise<void> {
    throw new ServiceUnavailableException({
      code: 'LOGIN_NOT_OPEN',
      message: 'Login opens at launch. Join the early-access list on our website.',
    });
  }
}
