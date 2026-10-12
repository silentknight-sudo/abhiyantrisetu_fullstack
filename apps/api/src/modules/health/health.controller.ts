import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Sql } from 'postgres';
import { Public } from '../../common/auth';
import { SQL } from '../../db/db.module';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  @Get()
  async check() {
    try {
      await this.sql`select 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'up' };
  }
}
