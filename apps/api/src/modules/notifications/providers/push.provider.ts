import { Injectable, Logger } from '@nestjs/common';

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushMessage {
  title: string;
  body: string;
  /** Deep-link data for the app, e.g. { screen: 'lead', id }. */
  data: Record<string, string>;
}

export interface PushResult {
  ok: boolean;
  /** Tokens the platform says are gone; the caller deletes them. */
  deadTokens: string[];
  error?: string;
}

export interface PushProvider {
  send(tokens: string[], msg: PushMessage): Promise<PushResult>;
}

/** Development/test: records pushes instead of sending them. */
@Injectable()
export class ConsolePushProvider implements PushProvider {
  private readonly logger = new Logger('ConsolePush');
  readonly sent: { tokens: string[]; msg: PushMessage }[] = [];

  async send(tokens: string[], msg: PushMessage) {
    this.sent.push({ tokens, msg });
    if (process.env.NODE_ENV !== 'test')
      this.logger.log(`→ ${tokens.length} device(s): ${msg.title}`);
    return { ok: true, deadTokens: [] };
  }
}

/** Expo push service: one call fans out to FCM (Android) and APNs (iOS). */
export class ExpoPushProvider implements PushProvider {
  constructor(
    private readonly accessToken?: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(tokens: string[], msg: PushMessage): Promise<PushResult> {
    const res = await this.fetchImpl('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: JSON.stringify(tokens.map((to) => ({ to, sound: 'default', ...msg }))),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      data?: { status: 'ok' | 'error'; message?: string; details?: { error?: string } }[];
    };
    if (!res.ok || !body.data) return { ok: false, deadTokens: [], error: `Expo ${res.status}` };
    const deadTokens = body.data
      .map((t, i) => (t.details?.error === 'DeviceNotRegistered' ? tokens[i]! : null))
      .filter((t): t is string => t !== null);
    const firstError = body.data.find(
      (t) => t.status === 'error' && t.details?.error !== 'DeviceNotRegistered',
    );
    return { ok: !firstError, deadTokens, error: firstError?.message };
  }
}
