import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ASSISTANT_SYSTEM_PROMPT, type AssistantTurn, offlineReply } from '@setu/domain';
import { ENV, type Env } from '../../config/env';

@Injectable()
export class AssistantService {
  private readonly log = new Logger(AssistantService.name);
  private readonly client: Anthropic | null;

  constructor(@Inject(ENV) env: Env) {
    this.client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
  }

  /** Claude's reply when configured; the rule-based reply otherwise or if the call fails. */
  async chat(turns: AssistantTurn[]): Promise<{ reply: string; source: 'claude' | 'offline' }> {
    if (!this.client) return { reply: offlineReply(turns), source: 'offline' };
    try {
      const res = await this.client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 1024,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: ASSISTANT_SYSTEM_PROMPT,
        messages: turns,
      });
      const reply = res.content
        .flatMap((b) => (b.type === 'text' ? [b.text] : []))
        .join('')
        .trim();
      if (res.stop_reason === 'refusal' || !reply) {
        return { reply: offlineReply(turns), source: 'offline' };
      }
      return { reply, source: 'claude' };
    } catch (err) {
      this.log.warn(`Setu AI fell back to the rate card: ${String(err)}`);
      return { reply: offlineReply(turns), source: 'offline' };
    }
  }
}
