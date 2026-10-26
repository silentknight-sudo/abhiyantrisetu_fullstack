import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One codebase, two store apps. `APP_VARIANT=partner` builds the partner app (leads,
 * quotes, jobs); anything else builds the customer app.
 */
const variant = process.env.APP_VARIANT === 'partner' ? 'partner' : 'customer';
const isPartner = variant === 'partner';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isPartner ? 'Setu Partner' : 'Abhiyantri Setu',
  slug: isPartner ? 'setu-partner' : 'abhiyantri-setu',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: isPartner ? 'setupartner' : 'abhiyantrisetu',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: isPartner ? 'com.abhiyantrisetu.partner' : 'com.abhiyantrisetu.app',
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: isPartner ? 'com.abhiyantrisetu.partner' : 'com.abhiyantrisetu.app',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#F6EFE3' },
    predictiveBackGestureEnabled: false,
  },
  web: { output: 'single', favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      { backgroundColor: '#F6EFE3', image: './assets/splash-icon.png', imageWidth: 180 },
    ],
    ['expo-notifications', { color: '#FF9F43' }],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Photos you choose are attached to your request so professionals can quote accurately.',
        cameraPermission: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: isPartner
          ? 'Your location is used to show leads near you.'
          : 'Your location pins the job address so nearby professionals can find it.',
      },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    variant,
    // Set by `eas init`; needed for Expo push tokens.
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
