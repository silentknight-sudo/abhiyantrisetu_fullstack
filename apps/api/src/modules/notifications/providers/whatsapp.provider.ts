import { Injectable, Logger } from '@nestjs/common';

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');

export interface WhatsAppMessage {
  /** E.164, e.g. +919876543210 */
  to: string;
  template: string;
  language: 'en' | 'hi';
  bodyParams: string[];
  /** Quick-reply buttons: payloads come back to /v1/webhooks/whatsapp. */
  buttonPayloads?: string[];
}

export interface WhatsAppProvider {
  /** Returns the provider's message id. */
  send(msg: WhatsAppMessage): Promise<string>;
}

/** Development/test: records messages instead of sending them. */
@Injectable()
export class ConsoleWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger('ConsoleWhatsApp');
  readonly sent: WhatsAppMessage[] = [];

  async send(msg: WhatsAppMessage) {
    this.sent.push(msg);
    if (process.env.NODE_ENV !== 'test') {
      this.logger.log(`→ ${msg.to} [${msg.template}] ${msg.bodyParams.join(' | ')}`);
    }
    return `console-${this.sent.length}`;
  }
}

/**
 * Meta WhatsApp Cloud API (template messages). Works directly with Meta or with a BSP that
 * exposes the same API. Templates must be approved in WhatsApp Manager with the same name,
 * body variables in order, and quick-reply buttons in order.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(msg: WhatsAppMessage) {
    const components: unknown[] = [
      { type: 'body', parameters: msg.bodyParams.map((text) => ({ type: 'text', text })) },
      ...(msg.buttonPayloads ?? []).map((payload, index) => ({
        type: 'button',
        sub_type: 'quick_reply',
        index: String(index),
        parameters: [{ type: 'payload', payload }],
      })),
    ];
    const res = await this.fetchImpl(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: msg.to.replace(/^\+/, ''),
          type: 'template',
          template: { name: msg.template, language: { code: msg.language }, components },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const body = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok || !body.messages?.[0]) {
      throw new Error(`WhatsApp ${res.status}: ${body.error?.message ?? 'unknown error'}`);
    }
    return body.messages[0].id;
  }
}
