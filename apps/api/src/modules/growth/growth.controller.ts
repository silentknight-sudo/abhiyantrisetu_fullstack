import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import {
  applyReferralSchema,
  type SubscribeCarePlanInput,
  subscribeCarePlanSchema,
} from '@setu/schemas';
import { createZodDto, ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser, Public } from '../../common/auth';
import { AmcSubscriptionDto, CarePlanDto, ReferralDto } from '../../common/responses';
import { GrowthService } from './growth.service';

class ApplyReferralDto extends createZodDto(applyReferralSchema) {}

@ApiTags('growth')
@Controller()
export class GrowthController {
  constructor(@Inject(GrowthService) private readonly growth: GrowthService) {}

  @ApiBearerAuth()
  @ZodResponse({ status: 200, type: ReferralDto })
  @Get('me/referral')
  referral(@CurrentUser() user: AuthUser) {
    return this.growth.mine(user);
  }

  @ApiBearerAuth()
  @ZodResponse({ status: 200, type: ReferralDto })
  @Post('me/referral/apply')
  @HttpCode(200)
  apply(@CurrentUser() user: AuthUser, @Body() body: ApplyReferralDto) {
    return this.growth.apply(user, body.code);
  }

  @Public()
  @ZodResponse({ status: 200, type: [CarePlanDto] })
  @Get('catalog/care-plans')
  plans() {
    return this.growth.plans();
  }

  @ApiBearerAuth()
  @ZodResponse({ status: 200, type: [AmcSubscriptionDto] })
  @Get('care-plans')
  subscriptions(@CurrentUser() user: AuthUser) {
    return this.growth.subscriptions(user);
  }

  @ApiBearerAuth()
  @Post('care-plans')
  // A refined schema cannot be a DTO class, so validate and document it explicitly.
  @ZodResponse({ status: 201, type: AmcSubscriptionDto })
  @ApiBody({ schema: z.toJSONSchema(subscribeCarePlanSchema, { io: 'input' }) as object })
  subscribe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(subscribeCarePlanSchema)) body: SubscribeCarePlanInput,
  ) {
    return this.growth.subscribe(user, body);
  }

  @ApiBearerAuth()
  @ZodResponse({ status: 200, type: AmcSubscriptionDto })
  @Post('care-plans/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.growth.cancel(user, id);
  }
}
