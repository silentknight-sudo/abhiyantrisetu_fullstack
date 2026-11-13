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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addJobExtraSchema,
  addJobPhotosSchema,
  milestoneChangesSchema,
  milestoneReadySchema,
} from '@setu/schemas';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { type AuthUser, CurrentUser } from '../../common/auth';
import { JobWorkDto } from '../../common/responses';
import { JobWorkService } from './job-work.service';

class AddJobExtraDto extends createZodDto(addJobExtraSchema) {}
class AddJobPhotosDto extends createZodDto(addJobPhotosSchema) {}
class MilestoneReadyDto extends createZodDto(milestoneReadySchema) {}
class MilestoneChangesDto extends createZodDto(milestoneChangesSchema) {}

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs/:id')
export class JobWorkController {
  constructor(@Inject(JobWorkService) private readonly work: JobWorkService) {}

  /** Extras and site photos, for the job's customer, partner or staff. */
  @ZodResponse({ status: 200, type: JobWorkDto })
  @Get('work')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.work.work(user, id);
  }

  /** Partner: add a part or extra work; the customer must approve it. */
  @ZodResponse({ status: 201, type: JobWorkDto })
  @Post('extras')
  addExtra(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddJobExtraDto,
  ) {
    return this.work.addExtra(user, id, body);
  }

  @ZodResponse({ status: 200, type: JobWorkDto })
  @Post('extras/:extraId/approve')
  @HttpCode(200)
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('extraId', ParseUUIDPipe) extraId: string,
  ) {
    return this.work.decide(user, id, extraId, true);
  }

  @ZodResponse({ status: 200, type: JobWorkDto })
  @Post('extras/:extraId/decline')
  @HttpCode(200)
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('extraId', ParseUUIDPipe) extraId: string,
  ) {
    return this.work.decide(user, id, extraId, false);
  }

  /** Partner: attach uploaded before/after photos. */
  @ZodResponse({ status: 201, type: JobWorkDto })
  @Post('photos')
  addPhotos(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddJobPhotosDto,
  ) {
    return this.work.addPhotos(user, id, body);
  }

  /** Partner: mark a milestone ready, with photos. */
  @ZodResponse({ status: 200, type: JobWorkDto })
  @Post('milestones/:milestoneId/ready')
  @HttpCode(200)
  ready(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() body: MilestoneReadyDto,
  ) {
    return this.work.milestoneReady(user, id, milestoneId, body);
  }

  /** Customer: approve a ready milestone; its money is released to the partner. */
  @ZodResponse({ status: 200, type: JobWorkDto })
  @Post('milestones/:milestoneId/approve')
  @HttpCode(200)
  approveMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ) {
    return this.work.milestoneApprove(user, id, milestoneId);
  }

  /** Customer: ask for fixes on a ready milestone. */
  @ZodResponse({ status: 200, type: JobWorkDto })
  @Post('milestones/:milestoneId/changes')
  @HttpCode(200)
  changes(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() body: MilestoneChangesDto,
  ) {
    return this.work.milestoneChanges(user, id, milestoneId, body.note);
  }
}
