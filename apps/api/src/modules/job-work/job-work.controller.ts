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
import { addJobExtraSchema, addJobPhotosSchema } from '@setu/schemas';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { type AuthUser, CurrentUser } from '../../common/auth';
import { JobWorkDto } from '../../common/responses';
import { JobWorkService } from './job-work.service';

class AddJobExtraDto extends createZodDto(addJobExtraSchema) {}
class AddJobPhotosDto extends createZodDto(addJobPhotosSchema) {}

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
}
