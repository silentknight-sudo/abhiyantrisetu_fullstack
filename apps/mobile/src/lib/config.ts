import Constants from 'expo-constants';

export type Variant = 'customer' | 'partner';

/** Which store app this build is (set by APP_VARIANT in app.config.ts). */
export const VARIANT: Variant =
  Constants.expoConfig?.extra?.variant === 'partner' ? 'partner' : 'customer';
export const IS_PARTNER = VARIANT === 'partner';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const EAS_PROJECT_ID: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;
