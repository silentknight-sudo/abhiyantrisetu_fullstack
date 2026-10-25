import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ZodResponse, createZodDto } from 'nestjs-zod';
import { recordPayoutSchema } from '@setu/schemas';
import { z } from 'zod';
import { type AuthUser, CurrentUser, Public, Roles } from '../../common/auth';
import {
  JobPaymentsDto,
  LedgerBalancesDto,
  PaymentOrderDto,
  PaymentVerifiedDto,
  PayoutDueDto,
  PayoutRecordedDto,
} from '../../common/responses';
import { PaymentsService } from './payments.service';

class RecordPayoutDto extends createZodDto(recordPayoutSchema) {}
class CreateOrderDto extends createZodDto(z.object({ jobId: z.uuid() })) {}
class VerifyDto extends createZodDto(
  z.object({
    razorpayOrderId: z.string().min(1).max(64),
    razorpayPaymentId: z.string().min(1).max(64),
    razorpaySignature: z.string().min(1).max(128),
  }),
) {}

class FakeCheckoutDto extends createZodDto(
  z.object({ razorpayOrderId: z.string().min(1).max(64) }),
) {}

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @ZodResponse({ status: 201, type: PaymentOrderDto })
  @ApiBearerAuth()
  @Post('payments/orders')
  createOrder(@CurrentUser() user: AuthUser, @Body() body: CreateOrderDto) {
    return this.payments.createOrder(user, body.jobId);
  }

  @ZodResponse({ status: 200, type: PaymentVerifiedDto })
  @ApiBearerAuth()
  @Post('payments/verify')
  @HttpCode(200)
  async verify(@CurrentUser() user: AuthUser, @Body() body: VerifyDto) {
    const p = await this.payments.verifyCheckout(user, body);
    return { paymentId: p.id, status: p.status, amountPaise: p.amountPaise };
  }

  /** Development only (fake gateway): pays the order without Razorpay. */
  @ZodResponse({ status: 200, type: PaymentVerifiedDto })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Development only: completes a fake-gateway order (404 otherwise)' })
  @Post('payments/fake-checkout')
  async fakeCheckout(@CurrentUser() user: AuthUser, @Body() body: FakeCheckoutDto) {
    const p = await this.payments.completeFakeCheckout(user, body.razorpayOrderId);
    return { paymentId: p.id, status: p.status, amountPaise: p.amountPaise };
  }

  @ZodResponse({ status: 200, type: JobPaymentsDto })
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

  @ZodResponse({ status: 200, type: LedgerBalancesDto })
  @ApiBearerAuth()
  @Roles('ops', 'finance', 'super_admin')
  @Get('admin/ledger/balances')
  balances() {
    return this.payments.balances();
  }

  @ZodResponse({ status: 200, type: [PayoutDueDto] })
  @ApiBearerAuth()
  @Roles('ops', 'finance', 'super_admin')
  @Get('admin/payouts')
  payoutsDue() {
    return this.payments.payoutsDue();
  }

  @ZodResponse({ status: 201, type: PayoutRecordedDto })
  @ApiBearerAuth()
  @Roles('finance', 'super_admin')
  @Post('admin/payouts')
  recordPayout(@CurrentUser() staff: AuthUser, @Body() body: RecordPayoutDto, @Ip() ip: string) {
    return this.payments.recordPayout(staff, body, ip);
  }
}
