import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import {
  type CreateQuoteInput,
  createQuoteSchema,
  negotiateQuoteSchema,
  type ReviseQuoteInput,
  reviseQuoteSchema,
} from '@setu/schemas';
import { createZodDto, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { type AuthUser, CurrentUser } from '../../common/auth';
import { QuotesService } from './quotes.service';

class NegotiateDto extends createZodDto(negotiateQuoteSchema) {}

@ApiTags('leads & quotes')
@ApiBearerAuth()
@Controller()
export class QuotesController {
  constructor(@Inject(QuotesService) private readonly quotes: QuotesService) {}

  // Partner side

  @Get('partner/leads')
  leads(@CurrentUser() user: AuthUser) {
    return this.quotes.myLeads(user);
  }

  @Post('partner/leads/:id/seen')
  @HttpCode(200)
  seen(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.markSeen(user, id);
  }

  @Post('partner/leads/:id/decline')
  @HttpCode(200)
  decline(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.decline(user, id);
  }

  @Post('partner/leads/:id/quote')
  // Refined schemas cannot be DTO classes, so validate and document them explicitly.
  @ApiBody({ schema: z.toJSONSchema(createQuoteSchema, { io: 'input' }) as object })
  quote(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createQuoteSchema)) body: CreateQuoteInput,
  ) {
    return this.quotes.createQuote(user, id, body);
  }

  @Post('quotes/:id/revise')
  @HttpCode(200)
  @ApiBody({ schema: z.toJSONSchema(reviseQuoteSchema, { io: 'input' }) as object })
  revise(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reviseQuoteSchema)) body: ReviseQuoteInput,
  ) {
    return this.quotes.revise(user, id, body);
  }

  @Post('quotes/:id/withdraw')
  @HttpCode(200)
  withdraw(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.withdraw(user, id);
  }

  // Either side

  @Get('quotes/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.getQuote(user, id);
  }

  // Customer side

  @Get('requirements/:id/quotes')
  forRequirement(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.forRequirement(user, id);
  }

  @Post('quotes/:id/negotiate')
  negotiate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: NegotiateDto,
  ) {
    return this.quotes.negotiate(user, id, body);
  }

  @Post('quotes/:id/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.accept(user, id);
  }
}
