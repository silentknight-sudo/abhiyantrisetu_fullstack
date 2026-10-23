import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser, Public, Roles } from '../../common/auth';
import { PaymentsService } from './payments.service';

class CreateOrderDto extends createZodDto(z.object({ jobId: z.uuid() })) {}
class VerifyDto extends createZodDto(
  z.object({
    razorpayOrderId: z.string().min(1).max(64),
    razorpayPaymentId: z.string().min(1).max(64),
    razorpaySignature: z.string().min(1).max(128),
  }),
) {}

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @ApiBearerAuth()
  @Post('payments/orders')
  createOrder(@CurrentUser() user: AuthUser, @Body() body: CreateOrderDto) {
    return this.payments.createOrder(user, body.jobId);
  }

  @ApiBearerAuth()
  @Post('payments/verify')
  @HttpCode(200)
  async verify(@CurrentUser() user: AuthUser, @Body() body: VerifyDto) {
    const p = await this.payments.verifyCheckout(user, body);
    return { paymentId: p.id, status: p.status, amountPaise: p.amountPaise };
  }

  @ApiBearerAuth()
  @Get('jobs/:id/payments')
  forJob(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.forJob(user, id);
  }

  /** Razorpay events, signed over the raw body with the webhook secret. */
  @Public()
  @SkipThrottle()
  @ApiExcludeEndpoint()
  @Post('webhooks/razorpay')
  @HttpCode(200)
  webhook(@Req() req: RawBodyRequest<Request>) {
    const eventId = req.headers['x-razorpay-event-id'];
    return this.payments.handleWebhook(
      req.rawBody,
      String(req.headers['x-razorpay-signature'] ?? ''),
      typeof eventId === 'string' && eventId ? eventId : undefined,
    );
  }

  @ApiBearerAuth()
  @Roles('ops', 'finance', 'super_admin')
  @Get('admin/ledger/balances')
  balances() {
    return this.payments.balances();
  }
}
