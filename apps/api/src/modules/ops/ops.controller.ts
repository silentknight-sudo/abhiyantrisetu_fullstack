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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createReportSchema,
  REPORT_STATUSES,
  resolveReportSchema,
  upsertSectorSchema,
} from '@setu/schemas';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser, Public, Roles } from '../../common/auth';
import {
  CoverageDto,
  FunnelDto,
  MatchingQueueItemDto,
  ReportDto,
  RescueDto,
  SectorDto,
} from '../../common/responses';
import { OpsService } from './ops.service';

class CreateReportDto extends createZodDto(createReportSchema) {}
class ResolveReportDto extends createZodDto(resolveReportSchema) {}
class UpsertSectorDto extends createZodDto(upsertSectorSchema) {}
class ReportsQueryDto extends createZodDto(
  z.object({ status: z.enum(REPORT_STATUSES).optional() }),
) {}
class FunnelQueryDto extends createZodDto(
  z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }),
) {}
class CoverageQueryDto extends createZodDto(
  z.object({ sector: z.string().trim().min(1).max(60) }),
) {}
class OkDto extends createZodDto(z.object({ ok: z.literal(true) })) {}

@ApiTags('ops')
@ApiBearerAuth()
@Controller()
export class OpsController {
  constructor(@Inject(OpsService) private readonly ops: OpsService) {}

  @ZodResponse({ status: 200, type: [MatchingQueueItemDto] })
  @Get('admin/matching')
  @Roles('ops', 'super_admin')
  queue() {
    return this.ops.matchingQueue();
  }

  /** Send a request that is short of quotes to more professionals. */
  @ZodResponse({ status: 200, type: RescueDto })
  @HttpCode(200)
  @Post('admin/requirements/:id/rescue')
  @Roles('ops', 'super_admin')
  rescue(@CurrentUser() staff: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string) {
    return this.ops.rescue(staff, id, ip);
  }

  /** A customer reports a professional to Setu's trust & safety team. */
  @ZodResponse({ status: 201, type: OkDto })
  @Post('reports')
  report(@CurrentUser() user: AuthUser, @Body() body: CreateReportDto) {
    return this.ops.report(user, body);
  }

  @ZodResponse({ status: 200, type: [ReportDto] })
  @Get('admin/reports')
  @Roles('ops', 'support', 'super_admin')
  reports(@Query() q: ReportsQueryDto) {
    return this.ops.reports(q.status);
  }

  @ZodResponse({ status: 200, type: ReportDto })
  @HttpCode(200)
  @Post('admin/reports/:id/resolve')
  @Roles('ops', 'support', 'super_admin')
  resolve(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResolveReportDto,
    @Ip() ip: string,
  ) {
    return this.ops.resolve(staff, id, body, ip);
  }

  @ZodResponse({ status: 200, type: FunnelDto })
  @Get('admin/funnel')
  @Roles('ops', 'super_admin')
  funnel(@Query() q: FunnelQueryDto) {
    return this.ops.funnel(q.days);
  }

  @ZodResponse({ status: 200, type: [SectorDto] })
  @Get('admin/sectors')
  @Roles('ops', 'super_admin')
  sectors() {
    return this.ops.sectors();
  }

  @ZodResponse({ status: 200, type: SectorDto })
  @HttpCode(200)
  @Post('admin/sectors')
  @Roles('ops', 'super_admin')
  upsertSector(@CurrentUser() staff: AuthUser, @Body() body: UpsertSectorDto, @Ip() ip: string) {
    return this.ops.upsertSector(staff, body, ip);
  }

  /** Whether Setu serves a sector yet (live) or is collecting interest (waitlist). */
  @ZodResponse({ status: 200, type: CoverageDto })
  @Public()
  @Get('catalog/coverage')
  coverage(@Query() q: CoverageQueryDto) {
    return this.ops.coverage(q.sector);
  }
}
