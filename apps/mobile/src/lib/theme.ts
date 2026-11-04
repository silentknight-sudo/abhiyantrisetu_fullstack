import { colors, radius, spacing, typeScale } from '@setu/ui-tokens';
import { useColorScheme } from 'react-native';

export type Palette = (typeof colors)['light'] | (typeof colors)['dark'];

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? colors.dark : colors.light;
}

export { radius, spacing, typeScale };

/** Font families loaded in the root layout (same faces as the website). */
export const font = {
  heading: 'PlusJakartaSans_700Bold',
  headingHeavy: 'PlusJakartaSans_800ExtraBold',
  headingSemi: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** Soft card shadow; elevation for Android. */
export const shadow = {
  shadowColor: '#1A3A52',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
