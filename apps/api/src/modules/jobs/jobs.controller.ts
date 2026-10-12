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
import { type AuthUser, CurrentUser, Roles } from '../../common/auth';
import { ReasonDto, ResolveDisputeDto, ScheduleJobDto, StartJobDto } from '../../common/dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.jobs.listMine(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.get(user, id);
  }

  @Get(':id/events')
  events(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.history(user, id);
  }

  @Post(':id/schedule')
  @HttpCode(200)
  schedule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ScheduleJobDto,
  ) {
    return this.jobs.schedule(user, id, body.slotStart);
  }

  @Post(':id/reschedule')
  @HttpCode(200)
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ScheduleJobDto,
  ) {
    return this.jobs.reschedule(user, id, body.slotStart);
  }

  @Post(':id/start')
  @HttpCode(200)
  start(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: StartJobDto,
  ) {
    return this.jobs.start(user, id, body.startCode);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.complete(user, id);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.confirm(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
  ) {
    return this.jobs.cancel(user, id, body.reason);
  }

  @Post(':id/dispute')
  @HttpCode(200)
  dispute(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
  ) {
    return this.jobs.dispute(user, id, body.reason);
  }

  @Post(':id/resolve')
  @HttpCode(200)
  @Roles('ops', 'support', 'super_admin')
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResolveDisputeDto,
  ) {
    return this.jobs.resolve(user, id, body.outcome, body.note);
  }

  @Post(':id/start-code')
  @HttpCode(200)
  regenerateStartCode(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.regenerateStartCode(user, id);
  }
}
