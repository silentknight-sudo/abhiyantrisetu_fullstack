import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { uploadRequestSchema } from '@setu/schemas';
import type { Request, Response } from 'express';
import { ZodResponse, createZodDto } from 'nestjs-zod';
import { type AuthUser, CurrentUser, Public } from '../../common/auth';
import { UploadSlotDto } from '../../common/responses';
import { STORAGE_PROVIDER, LocalStorageProvider, type StorageProvider } from './storage.provider';
import { StorageService } from './storage.service';

class UploadRequestDto extends createZodDto(uploadRequestSchema) {}

@ApiTags('uploads')
@Controller('uploads')
export class StorageController {
  constructor(
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider | null,
  ) {}

  @ZodResponse({ status: 201, type: UploadSlotDto })
  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: UploadRequestDto) {
    return this.storage.createUpload(user, body);
  }

  private local() {
    if (!(this.provider instanceof LocalStorageProvider)) throw new NotFoundException();
    return this.provider;
  }

  /** Development only: the local stand-in for an S3 upload. */
  @Public()
  @ApiExcludeEndpoint()
  @Put('local')
  @HttpCode(200)
  async put(@Query() q: Record<string, string>, @Req() req: Request) {
    const local = this.local();
    const type = String(req.headers['content-type'] ?? '');
    if (!local.verify('PUT', q.key ?? '', Number(q.exp), q.sig ?? '', type))
      throw new ForbiddenException('Bad or expired link');
    if (!Buffer.isBuffer(req.body) || req.body.length === 0)
      throw new ForbiddenException('Empty upload');
    await local.write(q.key!, req.body, type);
    return { ok: true };
  }

  /** Development only: the local stand-in for an S3 download. */
  @Public()
  @ApiExcludeEndpoint()
  @Get('local')
  async get(@Query() q: Record<string, string>, @Res() res: Response) {
    const local = this.local();
    if (!local.verify('GET', q.key ?? '', Number(q.exp), q.sig ?? ''))
      throw new ForbiddenException('Bad or expired link');
    const file = await local.read(q.key!).catch(() => null);
    if (!file) throw new NotFoundException();
    res.setHeader('cache-control', 'private, max-age=600');
    // Shown by the apps from another origin, as S3 links are (helmet defaults to same-origin).
    res.setHeader('cross-origin-resource-policy', 'cross-origin');
    res.type(file.contentType).send(file.body);
  }
}
