import {
  Body,
  Controller,
  Get,
  HttpCode,
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
  type AdminServiceInput,
  type AdminServiceUpdate,
  adminAuditQuerySchema,
  adminServiceInputSchema,
  adminServiceUpdateSchema,
  adminUserActionSchema,
  adminUsersQuerySchema,
} from '@setu/schemas';
import { createZodDto, ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser, Roles } from '../../common/auth';
import { AdminAuditDto, AdminServiceDto, AdminUserDto } from '../../common/responses';
import { ManageService } from './manage.service';

class UsersQueryDto extends createZodDto(adminUsersQuerySchema) {}
class AuditQueryDto extends createZodDto(adminAuditQuerySchema) {}
class UserActionDto extends createZodDto(adminUserActionSchema) {}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class ManageController {
  constructor(@Inject(ManageService) private readonly manage: ManageService) {}

  // ---------- catalogue ----------

  @ZodResponse({ status: 200, type: [AdminServiceDto] })
  @Get('services')
  @Roles('ops', 'super_admin')
  services() {
    return this.manage.listServices();
  }

  @Post('services')
  @Roles('ops', 'super_admin')
  @ZodResponse({ status: 201, type: AdminServiceDto })
  @ApiBody({ schema: z.toJSONSchema(adminServiceInputSchema, { io: 'input' }) as object })
  createService(
    @CurrentUser() staff: AuthUser,
    @Body(new ZodValidationPipe(adminServiceInputSchema)) body: AdminServiceInput,
    @Ip() ip: string,
  ) {
    return this.manage.createService(staff, body, ip);
  }

  @Patch('services/:id')
  @Roles('ops', 'super_admin')
  @ZodResponse({ status: 200, type: AdminServiceDto })
  @ApiBody({ schema: z.toJSONSchema(adminServiceUpdateSchema, { io: 'input' }) as object })
  updateService(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(adminServiceUpdateSchema)) body: AdminServiceUpdate,
    @Ip() ip: string,
  ) {
    return this.manage.updateService(staff, id, body, ip);
  }

  // ---------- users ----------

  @ZodResponse({ status: 200, type: [AdminUserDto] })
  @Get('users')
  @Roles('support', 'ops', 'super_admin')
  users(@Query() q: UsersQueryDto) {
    return this.manage.listUsers(q.q);
  }

  @ZodResponse({ status: 200, type: AdminUserDto })
  @Post('users/:id/suspend')
  @HttpCode(200)
  @Roles('ops', 'super_admin')
  suspend(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UserActionDto,
    @Ip() ip: string,
  ) {
    return this.manage.setStatus(staff, id, 'suspended', body.reason, ip);
  }

  @ZodResponse({ status: 200, type: AdminUserDto })
  @Post('users/:id/reactivate')
  @HttpCode(200)
  @Roles('ops', 'super_admin')
  reactivate(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UserActionDto,
    @Ip() ip: string,
  ) {
    return this.manage.setStatus(staff, id, 'active', body.reason, ip);
  }

  @ZodResponse({ status: 200, type: AdminUserDto })
  @Post('users/:id/reset-device')
  @HttpCode(200)
  @Roles('support', 'ops', 'super_admin')
  resetDevice(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UserActionDto,
    @Ip() ip: string,
  ) {
    return this.manage.resetDevice(staff, id, body.reason, ip);
  }

  // ---------- audit ----------

  @ZodResponse({ status: 200, type: [AdminAuditDto] })
  @Get('audit')
  @Roles('ops', 'finance', 'super_admin')
  audit(@Query() q: AuditQueryDto) {
    return this.manage.auditTrail(q);
  }
}
