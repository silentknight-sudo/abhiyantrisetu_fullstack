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
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { reviewPartnerDocSchema, uploadPartnerDocSchema } from '@setu/schemas';
import { createZodDto, ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser, Roles } from '../../common/auth';
import {
  ExpiringDocumentDto,
  PartnerDocumentDto,
  PartnerDocumentsDto,
} from '../../common/responses';
import { DocumentsService } from './documents.service';

class UploadDocDto extends createZodDto(uploadPartnerDocSchema) {}
class ExpiringQueryDto extends createZodDto(
  z.object({ days: z.coerce.number().int().min(0).max(365).default(30) }),
) {}

@ApiTags('partners')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(@Inject(DocumentsService) private readonly docs: DocumentsService) {}

  /** The partner's documents, what is still missing, and the verification steps. */
  @ZodResponse({ status: 200, type: PartnerDocumentsDto })
  @Get('partners/me/documents')
  mine(@CurrentUser() user: AuthUser) {
    return this.docs.mine(user);
  }

  @ZodResponse({ status: 201, type: PartnerDocumentsDto })
  @Post('partners/me/documents')
  upload(@CurrentUser() user: AuthUser, @Body() body: UploadDocDto) {
    return this.docs.upload(user, body);
  }

  @ZodResponse({ status: 200, type: PartnerDocumentsDto })
  @Get('admin/partners/:id/documents')
  @Roles('verification', 'ops', 'super_admin')
  forPartner(@Param('id', ParseUUIDPipe) id: string) {
    return this.docs.forPartner(id);
  }

  @Post('admin/documents/:id/review')
  @HttpCode(200)
  @Roles('verification', 'ops', 'super_admin')
  // A refined object cannot be a DTO class, so validate and document it explicitly.
  @ZodResponse({ status: 200, type: PartnerDocumentDto })
  @ApiBody({ schema: z.toJSONSchema(reviewPartnerDocSchema, { io: 'input' }) as object })
  review(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reviewPartnerDocSchema))
    body: z.infer<typeof reviewPartnerDocSchema>,
    @Ip() ip: string,
  ) {
    return this.docs.review(staff, id, body, ip);
  }

  /** Documents expiring within `days` (default 30), or already expired. */
  @ZodResponse({ status: 200, type: [ExpiringDocumentDto] })
  @Get('admin/documents/expiring')
  @Roles('verification', 'ops', 'super_admin')
  expiring(@Query() q: ExpiringQueryDto) {
    return this.docs.expiring(q.days);
  }
}
