import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { localeSchema } from '@setu/schemas';
import { eq } from 'drizzle-orm';
import { ZodResponse, createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser } from '../../common/auth';
import { MeDto } from '../../common/responses';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { users } from '../../db/schema';
import { TokensService } from './tokens.service';

class UpdateMeDto extends createZodDto(
  z.object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z.email().optional(),
    locale: localeSchema.optional(),
    /** DPDP consent notice version the user just accepted. */
    consentVersion: z.string().trim().min(1).max(20).optional(),
  }),
) {}

const publicColumns = {
  id: users.id,
  phone: users.phone,
  name: users.name,
  email: users.email,
  locale: users.locale,
  roles: users.roles,
  consentVersion: users.consentVersion,
  whatsappOptInAt: users.whatsappOptInAt,
  createdAt: users.createdAt,
};

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(TokensService) private readonly tokens: TokensService,
  ) {}

  @ZodResponse({ status: 200, type: MeDto })
  @Get()
  async get(@CurrentUser() me: AuthUser) {
    const [user] = await this.db.select(publicColumns).from(users).where(eq(users.id, me.id));
    if (!user) throw new NotFoundException();
    return user;
  }

  @ZodResponse({ status: 200, type: MeDto })
  @Patch()
  async update(@CurrentUser() me: AuthUser, @Body() body: UpdateMeDto) {
    const { consentVersion, ...rest } = body;
    const [user] = await this.db
      .update(users)
      .set({ ...rest, ...(consentVersion ? { consentVersion, consentedAt: new Date() } : {}) })
      .where(eq(users.id, me.id))
      .returning(publicColumns);
    return user!;
  }

  /**
   * In-app account deletion (App Store requirement, DPDP erasure). Personal fields are
   * cleared and the phone freed; transactional records keep the anonymised user id.
   */
  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() me: AuthUser) {
    await this.db
      .update(users)
      .set({
        status: 'deleted',
        phone: `deleted:${me.id}`,
        name: null,
        email: null,
        boundDeviceId: null,
        deletedAt: new Date(),
      })
      .where(eq(users.id, me.id));
    await this.tokens.revokeAllForUser(me.id);
  }
}
