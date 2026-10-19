import { Body, Controller, Get, Header, HttpCode, Inject, Ip, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WAITLIST_ROLES, waitlistSignupSchema } from '@setu/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Public, Roles } from '../../common/auth';
import { WaitlistService } from './waitlist.service';

class WaitlistSignupDto extends createZodDto(waitlistSignupSchema) {}
class WaitlistQueryDto extends createZodDto(
  z.object({
    role: z.enum(WAITLIST_ROLES).optional(),
    sector: z.string().trim().max(80).optional(),
    limit: z.coerce.number().int().min(1).max(1000).default(200),
    offset: z.coerce.number().int().min(0).default(0),
  }),
) {}

@ApiTags('waitlist')
@Controller()
export class WaitlistController {
  constructor(@Inject(WaitlistService) private readonly waitlist: WaitlistService) {}

  @Public()
  @Post('waitlist')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  signUp(@Body() body: WaitlistSignupDto, @Ip() ip: string) {
    return this.waitlist.signUp(body, ip);
  }

  @ApiBearerAuth()
  @Roles('ops', 'support', 'super_admin')
  @Get('admin/waitlist')
  list(@Query() q: WaitlistQueryDto) {
    return this.waitlist.list(q, q.limit, q.offset);
  }

  @ApiBearerAuth()
  @Roles('ops', 'support', 'super_admin')
  @Get('admin/waitlist/summary')
  summary() {
    return this.waitlist.summary();
  }

  @ApiBearerAuth()
  @Roles('ops', 'support', 'super_admin')
  @Get('admin/waitlist/export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="setu-waitlist.csv"')
  export(@Query() q: WaitlistQueryDto) {
    return this.waitlist.csv(q);
  }
}
