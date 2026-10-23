import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  type RawBodyRequest,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ZodResponse, createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser, Public } from '../../common/auth';
import { hmac, safeEqualHex } from '../../common/crypto';
import { NotificationDto } from '../../common/responses';
import { ENV, type Env } from '../../config/env';
import { NotificationsService } from './notifications.service';
import { WhatsAppInboundService } from './whatsapp-inbound.service';

class PushTokenDto extends createZodDto(
  z.object({
    token: z.string().regex(/^(Exponent|Expo)PushToken\[[\w-]+\]$/, 'Not an Expo push token'),
    platform: z.enum(['ios', 'android']),
  }),
) {}
class RemovePushTokenDto extends createZodDto(z.object({ token: z.string().min(1).max(200) })) {}
class OptInDto extends createZodDto(z.object({ optIn: z.boolean() })) {}

@ApiTags('notifications')
@Controller()
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(WhatsAppInboundService) private readonly inbound: WhatsAppInboundService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @ApiBearerAuth()
  @Post('me/push-tokens')
  @HttpCode(204)
  async addToken(@CurrentUser() user: AuthUser, @Body() body: PushTokenDto) {
    await this.notifications.registerPushToken(user.id, body.token, body.platform);
  }

  @ApiBearerAuth()
  @Delete('me/push-tokens')
  @HttpCode(204)
  async removeToken(@CurrentUser() user: AuthUser, @Body() body: RemovePushTokenDto) {
    await this.notifications.removePushToken(user.id, body.token);
  }

  @ApiBearerAuth()
  @Post('me/whatsapp-opt-in')
  @HttpCode(204)
  async optIn(@CurrentUser() user: AuthUser, @Body() body: OptInDto) {
    await this.notifications.setWhatsAppOptIn(user.id, body.optIn);
  }

  @ZodResponse({ status: 200, type: [NotificationDto] })
  @ApiBearerAuth()
  @Get('me/notifications')
  inbox(@CurrentUser() user: AuthUser) {
    return this.notifications.inbox(user.id);
  }

  /** Meta's one-time subscription check. */
  @Public()
  @SkipThrottle()
  @ApiExcludeEndpoint()
  @Get('webhooks/whatsapp')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (
      mode === 'subscribe' &&
      this.env.WHATSAPP_VERIFY_TOKEN &&
      token === this.env.WHATSAPP_VERIFY_TOKEN
    ) {
      return challenge;
    }
    throw new ForbiddenException();
  }

  /** Inbound messages and button taps, signed with the app secret. */
  @Public()
  @SkipThrottle()
  @ApiExcludeEndpoint()
  @Post('webhooks/whatsapp')
  @HttpCode(200)
  async receive(@Req() req: RawBodyRequest<Request>) {
    const secret = this.env.WHATSAPP_APP_SECRET;
    if (secret) {
      const header = String(req.headers['x-hub-signature-256'] ?? '');
      const expected = hmac(secret, req.rawBody?.toString('utf8') ?? '');
      if (!header.startsWith('sha256=') || !safeEqualHex(header.slice(7), expected)) {
        throw new ForbiddenException('Bad signature');
      }
    } else if (this.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('WhatsApp webhook is not configured');
    }
    await this.inbound.handle(req.body);
    return { ok: true };
  }
}
