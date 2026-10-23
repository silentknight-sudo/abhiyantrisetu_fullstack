import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { inboundWebhooks, users } from '../../db/schema';
import { QuotesService } from '../quotes/quotes.service';

interface WaMessage {
  id: string;
  from: string;
  type: string;
  button?: { payload?: string };
  interactive?: { button_reply?: { id?: string } };
}

const LEAD_ACTION = /^lead:([0-9a-f-]{36}):(accept|decline)$/;

/**
 * Handles quick-reply taps from WhatsApp. "Accept" marks the lead as seen so the partner
 * is prompted to quote; "Not today" declines it. Each message id is handled once.
 */
@Injectable()
export class WhatsAppInboundService {
  private readonly logger = new Logger('WhatsAppInbound');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(QuotesService) private readonly quotes: QuotesService,
  ) {}

  async handle(body: unknown) {
    const entries =
      (body as { entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[] })?.entry ?? [];
    for (const message of entries
      .flatMap((e) => e.changes ?? [])
      .flatMap((c) => c.value?.messages ?? [])) {
      const [fresh] = await this.db
        .insert(inboundWebhooks)
        .values({ provider: 'whatsapp', externalId: message.id, payload: message })
        .onConflictDoNothing()
        .returning({ id: inboundWebhooks.id });
      if (!fresh) continue; // already handled (Meta retries deliveries)

      let error: string | null = null;
      try {
        await this.apply(message);
      } catch (err) {
        error = (err as Error).message;
        this.logger.warn(`Message ${message.id}: ${error}`);
      }
      await this.db
        .update(inboundWebhooks)
        .set({ processedAt: new Date(), error })
        .where(eq(inboundWebhooks.id, fresh.id));
    }
  }

  private async apply(message: WaMessage) {
    const payload = message.button?.payload ?? message.interactive?.button_reply?.id;
    const match = payload ? LEAD_ACTION.exec(payload) : null;
    if (!match) return; // free text: support desk handles it in the BSP inbox
    const [user] = await this.db
      .select({ id: users.id, roles: users.roles })
      .from(users)
      .where(eq(users.phone, `+${message.from.replace(/^\+/, '')}`));
    if (!user) throw new Error('Unknown sender');
    const [, leadId, action] = match;
    // Ownership is checked inside: a lead can only be changed by its partner.
    if (action === 'accept') await this.quotes.markSeen(user, leadId!);
    else await this.quotes.decline(user, leadId!);
  }
}
