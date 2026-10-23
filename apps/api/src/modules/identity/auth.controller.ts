import { Body, Controller, HttpCode, Inject, Ip, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { Public, UserAgent } from '../../common/auth';
import { OtpSendDto, OtpVerifyDto, RefreshDto } from '../../common/dto';
import { AuthSessionDto, OtpSentDto, TokenPairDto } from '../../common/responses';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(TokensService) private readonly tokens: TokensService,
  ) {}

  @ZodResponse({ status: 200, type: OtpSentDto })
  @Post('otp/send')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  send(@Body() body: OtpSendDto, @Ip() ip: string) {
    return this.otp.send(body.phone, ip);
  }

  @ZodResponse({ status: 200, type: AuthSessionDto })
  @Post('otp/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verify(@Body() body: OtpVerifyDto, @UserAgent() userAgent?: string) {
    return this.auth.verifyAndLogin(body, { userAgent });
  }

  @ZodResponse({ status: 200, type: TokenPairDto })
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshDto, @UserAgent() userAgent?: string) {
    return this.tokens.rotate(body.refreshToken, { userAgent });
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: RefreshDto) {
    await this.tokens.revoke(body.refreshToken);
  }
}
