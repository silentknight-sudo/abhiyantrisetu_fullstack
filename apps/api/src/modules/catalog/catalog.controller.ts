import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { asc, eq } from 'drizzle-orm';
import { Public } from '../../common/auth';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { categories } from '../../db/schema';

@ApiTags('catalog')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('categories')
  categories() {
    return this.db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        slug: categories.slug,
        requirementType: categories.requirementType,
        nameEn: categories.nameEn,
        nameHi: categories.nameHi,
        icon: categories.icon,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.nameEn));
  }
}
