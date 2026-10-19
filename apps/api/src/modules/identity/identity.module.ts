import { Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MeController } from './me.controller';
import { OtpService } from './otp.service';
import { ConsoleSmsProvider } from './sms/console.provider';
import { DisabledSmsProvider } from './sms/disabled.provider';
import { Msg91SmsProvider } from './sms/msg91.provider';
import { SMS_PROVIDER } from './sms/sms.provider';
import { TokensService } from './tokens.service';

@Module({
  controllers: [AuthController, MeController],
  providers: [
    OtpService,
    TokensService,
    AuthService,
    {
      provide: SMS_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.SMS_PROVIDER === 'msg91'
          ? new Msg91SmsProvider(env.MSG91_AUTH_KEY!, env.MSG91_OTP_TEMPLATE_ID!)
          : env.SMS_PROVIDER === 'disabled'
            ? new DisabledSmsProvider()
            : new ConsoleSmsProvider(),
    },
  ],
  exports: [TokensService],
})
export class IdentityModule {}
