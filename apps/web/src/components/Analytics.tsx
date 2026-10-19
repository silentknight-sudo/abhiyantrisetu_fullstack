'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

/** Starts PostHog when NEXT_PUBLIC_POSTHOG_KEY is set; renders nothing. */
export function Analytics() {
  useEffect(() => initAnalytics(), []);
  return null;
}
