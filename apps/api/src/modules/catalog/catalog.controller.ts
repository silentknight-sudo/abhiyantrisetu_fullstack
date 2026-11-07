import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { and, asc, eq } from 'drizzle-orm';
import { ZodResponse, createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Public } from '../../common/auth';
import { CatalogServiceDto, CategoryDto } from '../../common/responses';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { categories, services } from '../../db/schema';

class ServicesQueryDto extends createZodDto(
  z.object({ category: z.string().min(1).max(64).optional() }),
) {}

@ApiTags('catalog')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @ZodResponse({ status: 200, type: [CategoryDto] })
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

  /** The instant-booking menu: fixed-price services, optionally for one category slug. */
  @ZodResponse({ status: 200, type: [CatalogServiceDto] })
  @Get('services')
  services(@Query() q: ServicesQueryDto) {
    return this.db
      .select({
        id: services.id,
        categoryId: services.categoryId,
        slug: services.slug,
        nameEn: services.nameEn,
        nameHi: services.nameHi,
        groupEn: services.groupEn,
        groupHi: services.groupHi,
        description: services.description,
        unit: services.unit,
        durationMinutes: services.durationMinutes,
        pricePaise: services.basePricePaise,
      })
      .from(services)
      .innerJoin(categories, eq(categories.id, services.categoryId))
      .where(
        and(eq(services.isActive, true), q.category ? eq(categories.slug, q.category) : undefined),
      )
      .orderBy(asc(services.sortOrder));
  }
}
