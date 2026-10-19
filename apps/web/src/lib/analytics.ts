'use client';

/**
 * Product analytics (PostHog). Off unless NEXT_PUBLIC_POSTHOG_KEY is set, and the library
 * is only downloaded when it is.
 */
type PostHog = typeof import('posthog-js').default;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let client: Promise<PostHog | null> | null = null;

function load(): Promise<PostHog | null> {
  if (!KEY || typeof window === 'undefined') return Promise.resolve(null);
  client ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: 'history_change',
      person_profiles: 'identified_only',
      // No session recording: forms collect phone numbers.
      disable_session_recording: true,
    });
    return posthog;
  });
  return client;
}

export function initAnalytics() {
  void load();
}

export function track(event: string, properties?: Record<string, unknown>) {
  void load().then((ph) => ph?.capture(event, properties));
}
