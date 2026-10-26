import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createReviewSchema, reviewReplySchema } from '@setu/schemas';
import { ZodResponse, createZodDto } from 'nestjs-zod';
import { type AuthUser, CurrentUser } from '../../common/auth';
import { JobReviewDto, ReviewDto } from '../../common/responses';
import { ReviewsService } from './reviews.service';

class CreateReviewDto extends createZodDto(createReviewSchema) {}
class ReviewReplyDto extends createZodDto(reviewReplySchema) {}

@ApiTags('reviews')
@ApiBearerAuth()
@Controller()
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviews: ReviewsService) {}

  @ZodResponse({ status: 201, type: ReviewDto })
  @Post('jobs/:id/review')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviews.create(user, id, body);
  }

  @ZodResponse({ status: 200, type: JobReviewDto })
  @Get('jobs/:id/review')
  async forJob(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return { review: await this.reviews.forJob(user, id) };
  }

  @ZodResponse({ status: 200, type: [ReviewDto] })
  @Get('partners/:id/reviews')
  forPartner(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.forPartner(id);
  }

  @ZodResponse({ status: 200, type: ReviewDto })
  @Post('reviews/:id/reply')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewReplyDto,
  ) {
    return this.reviews.reply(user, id, body.reply);
  }
}
