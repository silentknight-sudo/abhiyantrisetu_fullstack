import { Body, Controller, HttpCode, Inject, Ip, Post, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/auth';
import { OtpSendDto, OtpVerifyDto, RefreshDto } from '../../common/dto';
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

  @Post('otp/send')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  send(@Body() body: OtpSendDto, @Ip() ip: string) {
    return this.otp.send(body.phone, ip);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verify(@Body() body: OtpVerifyDto, @Headers('user-agent') userAgent?: string) {
    return this.auth.verifyAndLogin(body, { userAgent });
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshDto, @Headers('user-agent') userAgent?: string) {
    return this.tokens.rotate(body.refreshToken, { userAgent });
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: RefreshDto) {
    await this.tokens.revoke(body.refreshToken);
  }
}
