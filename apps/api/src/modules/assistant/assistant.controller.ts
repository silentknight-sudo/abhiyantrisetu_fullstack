import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { assistantChatSchema } from '@setu/schemas';
import { ZodResponse, createZodDto } from 'nestjs-zod';
import { Public } from '../../common/auth';
import { AssistantReplyDto } from '../../common/responses';
import { AssistantService } from './assistant.service';

class AssistantChatDto extends createZodDto(assistantChatSchema) {}

@ApiTags('assistant')
@Controller()
export class AssistantController {
  constructor(@Inject(AssistantService) private readonly assistant: AssistantService) {}

  /** Setu AI chat for the website and apps; open to visitors, rate-limited per IP. */
  @ZodResponse({ status: 200, type: AssistantReplyDto })
  @Public()
  @Post('assistant/chat')
  @HttpCode(200)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  chat(@Body() body: AssistantChatDto) {
    return this.assistant.chat(body.messages);
  }
}
