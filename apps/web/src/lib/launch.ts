/**
 * Pre-launch switch. Until NEXT_PUBLIC_LAUNCHED=true, the apps, requirement posting,
 * Setu AI and partner sign-up show "Coming soon" instead of going live.
 */
export const LAUNCHED = process.env.NEXT_PUBLIC_LAUNCHED === 'true';

/** Main call-to-action label, before and after launch. */
export const PRIMARY_CTA = LAUNCHED ? 'Post a requirement' : 'Get early access';
