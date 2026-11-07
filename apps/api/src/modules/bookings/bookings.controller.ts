import { Body, Controller, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { type CreateBookingInput, createBookingSchema } from '@setu/schemas';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser } from '../../common/auth';
import { JobViewDto, RequirementDto } from '../../common/responses';
import { BookingsService } from './bookings.service';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller()
export class BookingsController {
  constructor(@Inject(BookingsService) private readonly bookings: BookingsService) {}

  /** Book fixed-price services for a slot. Returns the requirement partners are alerted about. */
  @Post('bookings')
  // A refined schema cannot be a DTO class, so validate and document it explicitly.
  @ZodResponse({ status: 201, type: RequirementDto })
  @ApiBody({ schema: z.toJSONSchema(createBookingSchema, { io: 'input' }) as object })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBookingSchema)) body: CreateBookingInput,
  ) {
    return this.bookings.create(user, body);
  }

  /** Partner: take an instant booking. The first partner to accept is hired and scheduled. */
  @ZodResponse({ status: 200, type: JobViewDto })
  @Post('partner/leads/:id/accept-booking')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.accept(user, id);
  }
}
