import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { Public } from '../../common/auth';
import { CatalogProDto, CategoryReviewsDto } from '../../common/responses';
import { ProsService } from './pros.service';

const slug = z.string().trim().min(1).max(64);
class ProsQueryDto extends createZodDto(
  z.object({
    category: slug,
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }),
) {}
class ReviewsQueryDto extends createZodDto(
  z.object({
    category: slug,
    sort: z.enum(['recent', 'detailed']).optional(),
    sector: z.string().trim().max(80).optional(),
  }),
) {}

@ApiTags('catalog')
@Public()
@Controller('catalog')
export class ProsController {
  constructor(@Inject(ProsService) private readonly pros: ProsService) {}

  /** Verified professionals near a point who can take bookings in a category. */
  @ZodResponse({ status: 200, type: [CatalogProDto] })
  @Get('pros')
  list(@Query() q: ProsQueryDto) {
    return this.pros.list(q.category, { lat: q.lat, lng: q.lng });
  }

  /** Reviews of completed jobs in a category, with the star breakdown. */
  @ZodResponse({ status: 200, type: CategoryReviewsDto })
  @Get('reviews')
  reviews(@Query() q: ReviewsQueryDto) {
    return this.pros.categoryReviews(q.category, { sort: q.sort, sector: q.sector });
  }
}
