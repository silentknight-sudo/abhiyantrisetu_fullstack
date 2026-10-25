import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JOB_STATES } from '@setu/domain';
import { ZodResponse, createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles } from '../../common/auth';
import { AdminJobDto, AdminOverviewDto } from '../../common/responses';
import { AdminService } from './admin.service';

class AdminJobsQueryDto extends createZodDto(z.object({ state: z.enum(JOB_STATES).optional() })) {}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @ZodResponse({ status: 200, type: AdminOverviewDto })
  @Get('overview')
  @Roles('ops', 'verification', 'support', 'finance', 'super_admin')
  overview() {
    return this.admin.overview();
  }

  @ZodResponse({ status: 200, type: [AdminJobDto] })
  @Get('jobs')
  @Roles('ops', 'support', 'finance', 'super_admin')
  jobs(@Query() q: AdminJobsQueryDto) {
    return this.admin.jobs(q.state);
  }
}
