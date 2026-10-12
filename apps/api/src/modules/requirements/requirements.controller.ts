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
import { type CreateRequirementInput, createRequirementSchema } from '@setu/schemas';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser } from '../../common/auth';
import { CancelRequirementDto } from '../../common/dto';
import { RequirementsService } from './requirements.service';

@ApiTags('requirements')
@ApiBearerAuth()
@Controller('requirements')
export class RequirementsController {
  constructor(@Inject(RequirementsService) private readonly requirements: RequirementsService) {}

  @Post()
  // A discriminated union cannot be a DTO class, so validate and document it explicitly.
  @ApiBody({ schema: z.toJSONSchema(createRequirementSchema, { io: 'input' }) as object })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createRequirementSchema)) body: CreateRequirementInput,
  ) {
    return this.requirements.create(user, body);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.requirements.listMine(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requirements.get(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelRequirementDto,
  ) {
    return this.requirements.cancel(user, id, body.reason);
  }
}
