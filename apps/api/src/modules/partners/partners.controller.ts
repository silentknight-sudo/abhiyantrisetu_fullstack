import {
  Body,
  Controller,
  Get,
  Inject,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import {
  partnerProfileSchema,
  partnerProfileUpdateSchema,
  verifyPartnerSchema,
} from '@setu/schemas';
import { createZodDto, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser, Roles } from '../../common/auth';
import { PartnersService } from './partners.service';

class PartnerProfileDto extends createZodDto(partnerProfileSchema) {}
class PartnerProfileUpdateDto extends createZodDto(partnerProfileUpdateSchema) {}
class PartnerListQueryDto extends createZodDto(
  z.object({
    status: z.enum(['pending', 'in_review', 'verified', 'rejected', 'suspended']).optional(),
  }),
) {}

@ApiTags('partners')
@ApiBearerAuth()
@Controller()
export class PartnersController {
  constructor(@Inject(PartnersService) private readonly partners: PartnersService) {}

  @Post('partners/me')
  create(@CurrentUser() user: AuthUser, @Body() body: PartnerProfileDto) {
    return this.partners.create(user, body);
  }

  @Get('partners/me')
  me(@CurrentUser() user: AuthUser) {
    return this.partners.requireMine(user);
  }

  @Patch('partners/me')
  update(@CurrentUser() user: AuthUser, @Body() body: PartnerProfileUpdateDto) {
    return this.partners.updateMine(user, body);
  }

  @Get('admin/partners')
  @Roles('verification', 'ops', 'super_admin')
  list(@Query() q: PartnerListQueryDto) {
    return this.partners.list(q.status);
  }

  @Post('admin/partners/:id/verification')
  @Roles('verification', 'ops', 'super_admin')
  // A refined object cannot be a DTO class, so validate explicitly.
  @ApiBody({ schema: z.toJSONSchema(verifyPartnerSchema, { io: 'input' }) as object })
  verify(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(verifyPartnerSchema)) body: z.infer<typeof verifyPartnerSchema>,
    @Ip() ip: string,
  ) {
    return this.partners.setVerification(staff, id, body, ip);
  }
}
